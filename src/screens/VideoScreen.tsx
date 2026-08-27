// src/screens/VideoScreen.tsx

import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  VideoView,
  useVideoPlayer,
} from 'expo-video';

import {
  useEventListener,
} from 'expo';

import {
  MaterialIcons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import * as ImagePicker from 'expo-image-picker';

import {
  useIsFocused,
} from '@react-navigation/native';

import {
  useAuth,
} from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { sizes, spacing } from '../theme';


// ============================================================
// DIMENSÕES
// ============================================================

const { height, width } = Dimensions.get('window');


// ============================================================
// API
// ============================================================

// ============================================================
// TIPOS
// ============================================================

interface VideoData {
  id?: string;
  _id?: string;

  uri: string;

  description?: string;

  user?: string;
  userName?: string;
  avatar?: string;

  duration?: number;

  category?: string;

  stimulusLevel?: number;

  tags?: string[];

  emotion?: string;

  // ❤️ Estado do like para o usuário logado
  likedByMe?: boolean;
}


interface CommentData {
  id?: string;
  _id?: string;

  videoId?: string;

  userId?: string;
  userName?: string;
  avatar?: string;

  text: string;

  createdAt?: string;
}


interface SelectedVideo {
  uri: string;
  duration?: number;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

interface FeedDecision {
  state?: string;
  action?: string;
  intervention?: string | null;
  feedStrategy?: {
    counterRatio?: number;
    reduceHighStimulus?: boolean;
    prioritizeLowStimulus?: boolean;
    diversifyCategories?: boolean;
  } | null;
}


// ============================================================
// HELPERS
// ============================================================

const getVideoId = (
  video: VideoData,
  index?: number,
): string => {

  const id =
    video?._id ||
    video?.id;

  if (id) {
    return String(id);
  }

  return `video-${index ?? 'unknown'}`;
};


const normalizeDuration = (
  value: unknown,
): number => {

  const duration =
    Number(value || 0);

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 0;
  }

  /*
   * ImagePicker normalmente entrega
   * duração em milissegundos.
   *
   * Nosso backend trabalha em segundos.
   */

  if (duration > 1000) {
    return duration / 1000;
  }

  return duration;
};


const safeStimulus = (
  value: unknown,
): number => {

  const stimulus =
    Number(value);

  if (!Number.isFinite(stimulus)) {
    return 0.5;
  }

  return Math.max(
    0,
    Math.min(
      1,
      stimulus,
    ),
  );
};


// ============================================================
// FETCH COM TIMEOUT
//
// Uploads grandes podem ficar vários minutos em andamento.
// O timeout é longo de propósito para não abortar vídeos grandes.
// ============================================================

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 10 * 60 * 1000,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};


// ============================================================
// PLAYER DE VÍDEO
//
// IMPORTANTE:
//
// Só o vídeo ativo recebe VideoPlayer.
// Os demais itens são apenas placeholders.
//
// Isso evita dezenas de players simultâneos.
// ============================================================

interface VideoItemProps {
  item: VideoData;
  index: number;
  isActive: boolean;
  isFocused: boolean;

  liked: boolean;

  onToggleLike: (
    video: VideoData,
  ) => void;

  onOpenComments: (
    video: VideoData,
  ) => void;

  onShare: (
    video: VideoData,
  ) => void;
}


const VideoItem = memo(
  ({
    item,
    index,
    isActive,
    isFocused,
    liked,
    onToggleLike,
    onOpenComments,
    onShare,
  }: VideoItemProps) => {

    const [
      isMuted,
      setIsMuted,
    ] = useState(false);

    const [
      hasError,
      setHasError,
    ] = useState(false);


    /*
     * SOMENTE cria o player quando o item
     * realmente está ativo.
     *
     * Isso é o principal ganho de performance.
     */

    const player =
      useVideoPlayer(
        isActive
          ? item.uri
          : null,
        (player) => {

          if (!player) {
            return;
          }

          player.loop = true;

          player.muted = false;

          player.keepScreenOnWhilePlaying =
            true;
        },
      );


    // ========================================================
    // PLAY / PAUSE
    // ========================================================

    useEffect(() => {

      if (!player) {
        return;
      }

      try {

        if (
          isActive &&
          isFocused
        ) {

          setHasError(false);

          player.play();

        } else {

          player.pause();

        }

      } catch (error) {

        console.log(
          '❌ erro player:',
          getVideoId(item, index),
          error,
        );

        setHasError(true);
      }

    }, [
      player,
      isActive,
      isFocused,
      item,
      index,
    ]);


    // ========================================================
    // MUTE
    // ========================================================

    useEffect(() => {

      if (!player) {
        return;
      }

      try {

        player.muted =
          isMuted;

      } catch {
        // player desmontando
      }

    }, [
      player,
      isMuted,
    ]);


    // ========================================================
    // STATUS DO PLAYER
    // ========================================================

    useEventListener(
      player,
      'statusChange',
      ({
        status,
        error,
      }) => {

        if (status === 'error') {

          console.log(
            '❌ erro reproduzindo:',
            getVideoId(item, index),
            error,
          );

          setHasError(true);

        } else if (
          status === 'readyToPlay'
        ) {

          setHasError(false);
        }
      },
    );


    // ========================================================
    // ITEM INATIVO
    //
    // Não renderiza player.
    // ========================================================

    if (
      !isActive ||
      !player
    ) {

      return (
        <View
          style={styles.videoContainer}
        />
      );
    }


    // ========================================================
    // MUTE
    // ========================================================

    const toggleMute =
      () => {

        setIsMuted(
          current =>
            !current,
        );
      };


    // ========================================================
    // NOME
    // ========================================================

    const userName =
      item.userName ||
      item.user ||
      'Usuário';


    // ========================================================
    // RENDER
    // ========================================================

    return (

      <View
        style={
          styles.videoContainer
        }
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor="#000"
          translucent={false}
        />


        {/* ==================================================
            VÍDEO
        ================================================== */}

        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          surfaceType="textureView"
          allowsPictureInPicture={false}
        />


        {/* ==================================================
            ERRO
        ================================================== */}

        {hasError && (

          <View
            style={
              styles.videoError
            }
          >

            <MaterialIcons
              name="error-outline"
              size={42}
              color="#fff"
            />

            <Text
              style={
                styles.videoErrorText
              }
            >
              Não foi possível reproduzir
              este vídeo.
            </Text>

          </View>
        )}


        {/* ==================================================
            AÇÕES
        ================================================== */}

        <View
          style={
            styles.actions
          }
        >

          <TouchableOpacity
            activeOpacity={0.75}
            style={
              styles.actionButton
            }
            onPress={() =>
              onToggleLike(item)
            }
          >

            <MaterialIcons
              name={
                liked
                  ? 'favorite'
                  : 'favorite-border'
              }
              size={31}
              color={
                liked
                  ? '#ff3040'
                  : '#fff'
              }
            />

            <Text
              style={
                styles.actionLabel
              }
            >
              {liked
                ? 'Curtido'
                : 'Curtir'}
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.75}
            style={
              styles.actionButton
            }
            onPress={() =>
              onOpenComments(item)
            }
          >

            <MaterialIcons
              name="chat-bubble-outline"
              size={30}
              color="#fff"
            />

            <Text
              style={
                styles.actionLabel
              }
            >
              Comentar
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.75}
            style={
              styles.actionButton
            }
            onPress={() =>
              onShare(item)
            }
          >

            <MaterialIcons
              name="share"
              size={30}
              color="#fff"
            />

            <Text
              style={
                styles.actionLabel
              }
            >
              Compartilhar
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.actionButton,
              styles.volumeButton,
            ]}
            onPress={toggleMute}
          >

            <MaterialIcons
              name={
                isMuted
                  ? 'volume-off'
                  : 'volume-up'
              }
              size={28}
              color="#fff"
            />

          </TouchableOpacity>

        </View>


        {/* ==================================================
            INFORMAÇÕES
        ================================================== */}

        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.48)']}
          locations={[0, 0.45, 1]}
          style={styles.contentScrim}
        />

        <View
          style={
            styles.overlay
          }
        >

          <View
            style={
              styles.userRow
            }
          >

            <View
              style={
                styles.avatar
              }
            >

              <Text
                style={
                  styles.avatarText
                }
              >
                {userName
                  .charAt(0)
                  .toUpperCase()}
              </Text>

            </View>


            <Text
              style={
                styles.user
              }
              numberOfLines={1}
            >
              @{userName}
            </Text>

          </View>


          {!!item.description && (

            <Text
              style={
                styles.description
              }
              numberOfLines={4}
            >
              {item.description}
            </Text>

          )}


          {!!item.category && (

            <View
              style={
                styles.categoryBadge
              }
            >

              <Text
                style={
                  styles.categoryText
                }
              >
                #{item.category}
              </Text>

            </View>

          )}

        </View>

      </View>
    );
  },
);

VideoItem.displayName =
  'VideoItem';


// ============================================================
// PREVIEW DO UPLOAD
// ============================================================

interface UploadPreviewProps {
  uri: string;
  isPlaying: boolean;
}


const UploadPreview = ({
  uri,
  isPlaying,
}: UploadPreviewProps) => {

  const player =
    useVideoPlayer(
      uri,
      (player) => {

        player.loop = true;

        player.muted = false;
      },
    );


  useEffect(() => {

    if (!player) {
      return;
    }

    try {

      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }

    } catch {
      // player desmontando
    }

  }, [
    player,
    isPlaying,
  ]);


  return (

    <VideoView
      player={player}
      style={
        styles.preview
      }
      contentFit="contain"
      nativeControls={true}
      allowsPictureInPicture={false}
      surfaceType="textureView"
    />

  );
};


// ============================================================
// VIDEO SCREEN
// ============================================================

const VideoScreen: React.FC =
  () => {

    const {
      user,
    } = useAuth();

    const isFocused =
      useIsFocused();


    // ========================================================
    // ESTADOS
    // ========================================================

    const [
      videos,
      setVideos,
    ] = useState<VideoData[]>(
      [],
    );


    const [
      activeIndex,
      setActiveIndex,
    ] = useState(0);


    const [
      modalVisible,
      setModalVisible,
    ] = useState(false);


    const [
      selectedVideo,
      setSelectedVideo,
    ] =
      useState<SelectedVideo | null>(
        null,
      );


    const [
      description,
      setDescription,
    ] = useState('');


    const [
      loading,
      setLoading,
    ] = useState(false);


    const [
      loadingFeed,
      setLoadingFeed,
    ] = useState(false);


    const [
      refreshing,
      setRefreshing,
    ] = useState(false);
    


    // ========================================================
    // 💬 COMENTÁRIOS
    // ========================================================

    const [
      commentModalVisible,
      setCommentModalVisible,
    ] = useState(false);


    const [
      commentVideo,
      setCommentVideo,
    ] = useState<VideoData | null>(
      null,
    );


    const [
      comments,
      setComments,
    ] = useState<CommentData[]>(
      [],
    );


    const [
      commentsLoading,
      setCommentsLoading,
    ] = useState(false);


    const [
      commentText,
      setCommentText,
    ] = useState('');


    const [
      commentSending,
      setCommentSending,
    ] = useState(false);


    const [feedDecision, setFeedDecision] =
  useState<FeedDecision>({
    state: 'normal',
    action: 'none',
    intervention: null,
    feedStrategy: null,
  });


    const [
      interventionVisible,
      setInterventionVisible,
    ] = useState(false);

    const interventionShownRef =
      useRef<string | null>(null);

    const interventionTimerRef =
      useRef<ReturnType<typeof setTimeout> | null>(
        null,
      );


    // ========================================================
    // REFS
    // ========================================================

    const currentVideoRef =
      useRef<VideoData | null>(
        null,
      );


    const startTimeRef =
      useRef<number>(0);


    const behaviorSendingRef =
      useRef(false);


    const fetchLockRef =
      useRef(false);


    const hasLoadedFeedRef =
      useRef(false);


    // ========================================================
    // ❤️ LIKES
    // ========================================================

    const likedVideoIdsRef =
      useRef<Set<string>>(
        new Set(),
      );


    const likeSendingRef =
      useRef<Set<string>>(
        new Set(),
      );


    // ========================================================
    // ❤️ NOVO LIKE NESTA VISUALIZAÇÃO
    // ========================================================

    const likedThisViewRef =
      useRef<{
        videoId: string | null;
        liked: boolean;
        startedLiked: boolean;
      }>({
        videoId: null,
        liked: false,
        startedLiked: false,
      });


    // ========================================================
    // 💬 COMENTÁRIO NESTA VISUALIZAÇÃO
    // ========================================================

    const commentedThisViewRef =
      useRef<{
        videoId: string | null;
        commented: boolean;
      }>({
        videoId: null,
        commented: false,
      });


    // ========================================================
    // 📤 COMPARTILHAMENTO NESTA VISUALIZAÇÃO
    // ========================================================

    const sharedThisViewRef =
      useRef<{
        videoId: string | null;
        shared: boolean;
      }>({
        videoId: null,
        shared: false,
      });


    const commentPauseStartedRef =
      useRef<number>(0);


    // ========================================================
    // ENVIAR COMPORTAMENTO
    // ========================================================

    const sendBehavior =
      useCallback(
        async (
          video: VideoData,
          watchTime: number,
          likedThisView: boolean,
          commentedThisView: boolean,
          sharedThisView: boolean,
        ) => {

          if (!user?._id) {
            return;
          }


          const videoId =
            video?._id ||
            video?.id;


          if (!videoId) {

            console.log(
              '⚠️ vídeo sem ID. Behavior ignorado.',
            );

            return;
          }


          const duration =
            normalizeDuration(
              video.duration,
            );


          let safeWatchTime =
            Number(watchTime);


          if (
            !Number.isFinite(
              safeWatchTime,
            ) ||
            safeWatchTime < 0
          ) {

            safeWatchTime = 0;
          }


          if (
            duration > 0 &&
            safeWatchTime > duration
          ) {

            safeWatchTime =
              duration;
          }


          const behaviorData = {

            userId:
              user._id,

            videoId:
              String(videoId),

            watchTime:
              Number(
                safeWatchTime
                  .toFixed(2),
              ),

            duration:
              Number(
                duration
                  .toFixed(2),
              ),

            stimulusLevel:
              Number(
                safeStimulus(
                  video.stimulusLevel,
                ).toFixed(2),
              ),

            category:
              video.category ||
              'general',

            tags:
              Array.isArray(
                video.tags,
              )
                ? video.tags
                : [],

            liked:
              likedThisView,

            commented:
              commentedThisView,

            shared:
              sharedThisView,

            sessionId: null,
          };


          console.log(
            '📊 enviando comportamento:',
            behaviorData,
          );


          try {

            const response =
              await fetch(
                `${API_BASE_URL}/behavior/track`,
                {
                  method: 'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body:
                    JSON.stringify(
                      behaviorData,
                    ),
                },
              );


            const raw =
              await response.text();


            let data: any = null;


            try {

              data =
                raw
                  ? JSON.parse(raw)
                  : null;

            } catch {

              data = {
                raw,
              };
            }


            if (!response.ok) {

              console.log(
                '❌ erro behavior:',
                response.status,
                data,
              );

              return;
            }


            console.log(
              '✅ comportamento salvo:',
              data,
            );

          } catch (err) {

            console.log(
              '❌ erro ao enviar comportamento:',
              err,
            );
          }

        },
        [
          user?._id,
        ],
      );


    // ========================================================
    // FINALIZAR VÍDEO
    // ========================================================

    const finishCurrentVideo =
      useCallback(
        () => {

          const video =
            currentVideoRef.current;


          const start =
            startTimeRef.current;


          if (
            !video ||
            !start
          ) {
            return;
          }


          if (
            behaviorSendingRef.current
          ) {
            return;
          }


          const activeCommentPauseMs =
            commentPauseStartedRef.current > 0
              ? Date.now() -
                commentPauseStartedRef.current
              : 0;


          const watchTime =
            Math.max(
              0,
              (
                Date.now() -
                start -
                activeCommentPauseMs
              ) / 1000,
            );


          console.log(
            '⏱ vídeo finalizado:',
            getVideoId(video),
            Number(
              watchTime.toFixed(2),
            ),
          );


          const currentVideoId =
            getVideoId(video);


          const likedThisView =
            likedThisViewRef.current.videoId ===
              currentVideoId &&
            likedThisViewRef.current.liked ===
              true;


          const commentedThisView =
            commentedThisViewRef.current.videoId ===
              currentVideoId &&
            commentedThisViewRef.current.commented ===
              true;


          const sharedThisView =
            sharedThisViewRef.current.videoId ===
              currentVideoId &&
            sharedThisViewRef.current.shared ===
              true;


          behaviorSendingRef.current =
            true;


          void sendBehavior(
            video,
            watchTime,
            likedThisView,
            commentedThisView,
            sharedThisView,
          ).finally(() => {

            behaviorSendingRef.current =
              false;

          });


          currentVideoRef.current =
            null;


          startTimeRef.current =
            0;


          likedThisViewRef.current = {
            videoId: null,
            liked: false,
            startedLiked: false,
          };


          commentedThisViewRef.current = {
            videoId: null,
            commented: false,
          };


          sharedThisViewRef.current = {
            videoId: null,
            shared: false,
          };


          commentPauseStartedRef.current =
            0;

        },
        [
          sendBehavior,
        ],
      );


    // ========================================================
    // VIEWABILITY
    // ========================================================

    const onViewRef =
      useRef(
        ({
          viewableItems,
        }: any) => {

          if (
            !viewableItems ||
            viewableItems.length === 0
          ) {
            return;
          }


          const first =
            viewableItems[0];


          const newVideo =
            first?.item;


          const newIndex =
            first?.index;


          if (
            !newVideo ||
            typeof newIndex !== 'number'
          ) {
            return;
          }


          const current =
            currentVideoRef.current;


          const currentId =
            current
              ? getVideoId(current)
              : null;


          const newId =
            getVideoId(
              newVideo,
              newIndex,
            );


          /*
           * Se mudou de vídeo,
           * salva o anterior.
           */

          if (
            current &&
            currentId !== newId
          ) {

            finishCurrentVideo();
          }


          /*
           * Mesmo vídeo:
           * não reinicia timer.
           */

          if (
            currentId === newId
          ) {

            return;
          }


          currentVideoRef.current =
            newVideo;


          likedThisViewRef.current = {
            videoId: newId,
            liked: false,
            startedLiked:
              likedVideoIdsRef
                .current
                .has(newId),
          };


          commentedThisViewRef.current = {
            videoId: newId,
            commented: false,
          };


          sharedThisViewRef.current = {
            videoId: newId,
            shared: false,
          };


          startTimeRef.current =
            Date.now();


          setActiveIndex(
            newIndex,
          );


          console.log(
            '▶️ iniciando vídeo:',
            newId,
          );

        },
      );


    // ========================================================
    // VIEWABILITY CONFIG
    // ========================================================

    const viewabilityConfig =
      useRef({
        itemVisiblePercentThreshold:
          80,
      }).current;


    // ========================================================
    // ❤️ CURTIR / DESCURTIR
    // ========================================================

    const toggleLike =
      useCallback(
        async (
          video: VideoData,
        ) => {

          if (!user?._id) {
            return;
          }


          const videoId =
            video?._id ||
            video?.id;


          if (!videoId) {
            return;
          }


          const safeVideoId =
            String(videoId);


          // Evita vários requests para o mesmo vídeo
          // enquanto um like/unlike já está em andamento.
          if (
            likeSendingRef
              .current
              .has(safeVideoId)
          ) {
            return;
          }


          likeSendingRef
            .current
            .add(safeVideoId);


          const wasLiked =
            likedVideoIdsRef
              .current
              .has(safeVideoId);


          const previousLikedThisView =
            likedThisViewRef.current.videoId ===
              safeVideoId
              ? likedThisViewRef.current.liked
              : false;


          const startedLikedThisView =
            likedThisViewRef.current.videoId ===
              safeVideoId
              ? likedThisViewRef.current.startedLiked
              : wasLiked;


          // ==================================================
          // UPDATE OTIMISTA
          //
          // O coração muda imediatamente.
          // Se o servidor falhar, fazemos rollback.
          // ==================================================

          if (wasLiked) {

            likedVideoIdsRef
              .current
              .delete(safeVideoId);

          } else {

            likedVideoIdsRef
              .current
              .add(safeVideoId);
          }


          setVideos(
            currentVideos =>
              currentVideos.map(
                currentVideo => {

                  if (
                    getVideoId(
                      currentVideo,
                    ) !== safeVideoId
                  ) {
                    return currentVideo;
                  }


                  return {
                    ...currentVideo,
                    likedByMe:
                      !wasLiked,
                  };
                },
              ),
          );


          try {

            console.log(
              wasLiked
                ? '🤍 enviando unlike:'
                : '❤️ enviando like:',
              safeVideoId,
            );


            const response =
              await fetch(
                `${API_BASE_URL}/videos/${safeVideoId}/like`,
                {
                  method:
                    wasLiked
                      ? 'DELETE'
                      : 'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body:
                    JSON.stringify({
                      userId:
                        user._id,
                    }),
                },
              );


            const raw =
              await response.text();


            let data: any = null;


            try {

              data =
                raw
                  ? JSON.parse(raw)
                  : null;

            } catch {

              data = { raw };
            }


            if (!response.ok) {

              throw new Error(
                data?.error ||
                  'Erro ao atualizar like',
              );
            }


            const serverLiked =
              data?.liked === true;


            // ==================================================
            // SINCRONIZA COM O SERVIDOR
            // ==================================================

            if (serverLiked) {

              likedVideoIdsRef
                .current
                .add(safeVideoId);

            } else {

              likedVideoIdsRef
                .current
                .delete(safeVideoId);
            }


            if (
              likedThisViewRef.current.videoId ===
              safeVideoId
            ) {

              likedThisViewRef.current.liked =
                !startedLikedThisView &&
                serverLiked;
            }


            setVideos(
              currentVideos =>
                currentVideos.map(
                  currentVideo => {

                    if (
                      getVideoId(
                        currentVideo,
                      ) !== safeVideoId
                    ) {
                      return currentVideo;
                    }


                    return {
                      ...currentVideo,
                      likedByMe:
                        serverLiked,
                    };
                  },
                ),
            );


            console.log(
              '✅ LIKE SERVIDOR:',
              {
                videoId:
                  safeVideoId,

                liked:
                  serverLiked,

                likeCount:
                  data?.likeCount,
              },
            );

          } catch (err) {

            console.log(
              '❌ erro like:',
              err,
            );


            // ================================================
            // ROLLBACK
            // ================================================

            if (
              likedThisViewRef.current.videoId ===
              safeVideoId
            ) {

              likedThisViewRef.current.liked =
                previousLikedThisView;
            }


            if (wasLiked) {

              likedVideoIdsRef
                .current
                .add(safeVideoId);

            } else {

              likedVideoIdsRef
                .current
                .delete(safeVideoId);
            }


            setVideos(
              currentVideos =>
                currentVideos.map(
                  currentVideo => {

                    if (
                      getVideoId(
                        currentVideo,
                      ) !== safeVideoId
                    ) {
                      return currentVideo;
                    }


                    return {
                      ...currentVideo,
                      likedByMe:
                        wasLiked,
                    };
                  },
                ),
            );

          } finally {

            likeSendingRef
              .current
              .delete(safeVideoId);
          }
        },
        [
          user?._id,
        ],
      );


    // ========================================================
    // 📤 COMPARTILHAR VÍDEO
    //
    // shared:true só é enviado no Behavior quando o usuário
    // realmente aciona o compartilhamento nesta visualização.
    // ========================================================

    const shareVideo =
      useCallback(
        async (
          video: VideoData,
        ) => {

          const videoId =
            video?._id ||
            video?.id;


          if (!videoId) {
            return;
          }


          const safeVideoId =
            String(videoId);


          const message =
            video.description
              ? `${video.description}\n\n${video.uri}`
              : video.uri;


          const shareStartedAt =
            Date.now();


          try {

            const result =
              await Share.share(
                {
                  title: 'MentalCare',
                  message,
                },
              );


            if (
              result.action ===
              Share.sharedAction
            ) {

              if (
                sharedThisViewRef.current.videoId ===
                safeVideoId
              ) {

                sharedThisViewRef.current.shared =
                  true;
              }


              console.log(
                '📤 vídeo compartilhado:',
                safeVideoId,
              );

            } else {

              console.log(
                '↩️ compartilhamento cancelado:',
                safeVideoId,
              );
            }

          } catch (err) {

            console.log(
              '❌ erro ao compartilhar:',
              err,
            );

          } finally {

            // O tempo no menu nativo de compartilhamento
            // não conta como tempo assistindo ao vídeo.
            if (
              currentVideoRef.current &&
              getVideoId(
                currentVideoRef.current,
              ) === safeVideoId &&
              startTimeRef.current > 0
            ) {

              startTimeRef.current +=
                Date.now() -
                shareStartedAt;
            }
          }

        },
        [],
      );


    // ========================================================
    // 💬 ABRIR COMENTÁRIOS
    // ========================================================

    const openComments =
      useCallback(
        async (
          video: VideoData,
        ) => {

          const videoId =
            video?._id ||
            video?.id;


          if (!videoId) {
            return;
          }


          const safeVideoId =
            String(videoId);


          setCommentVideo(
            video,
          );

          setComments(
            [],
          );

          setCommentText(
            '',
          );

          setCommentModalVisible(
            true,
          );


          if (
            currentVideoRef.current &&
            getVideoId(
              currentVideoRef.current,
            ) === safeVideoId &&
            commentPauseStartedRef.current === 0
          ) {

            commentPauseStartedRef.current =
              Date.now();
          }


          setCommentsLoading(
            true,
          );


          try {

            const response =
              await fetch(
                `${API_BASE_URL}/comments/video/${safeVideoId}`,
              );


            const raw =
              await response.text();


            let data: any = null;


            try {

              data =
                raw
                  ? JSON.parse(raw)
                  : null;

            } catch {

              data = {
                raw,
              };
            }


            if (!response.ok) {

              throw new Error(
                data?.error ||
                  'Erro ao buscar comentários',
              );
            }


            setComments(
              Array.isArray(
                data?.comments,
              )
                ? data.comments
                : [],
            );


          } catch (err) {

            console.log(
              '❌ erro comentários:',
              err,
            );

          } finally {

            setCommentsLoading(
              false,
            );
          }

        },
        [],
      );


    // ========================================================
    // 💬 FECHAR COMENTÁRIOS
    // ========================================================

    const closeComments =
      useCallback(
        () => {

          Keyboard.dismiss();


          if (
            commentPauseStartedRef.current > 0 &&
            startTimeRef.current > 0
          ) {

            const pauseDuration =
              Date.now() -
              commentPauseStartedRef.current;


            startTimeRef.current +=
              pauseDuration;
          }


          commentPauseStartedRef.current =
            0;


          setCommentModalVisible(
            false,
          );

          setCommentVideo(
            null,
          );

          setComments(
            [],
          );

          setCommentText(
            '',
          );

        },
        [],
      );


    // ========================================================
    // 💬 PUBLICAR COMENTÁRIO
    // ========================================================

    const submitComment =
      useCallback(
        async () => {

          if (
            !user?._id ||
            !commentVideo ||
            commentSending
          ) {
            return;
          }


          const text =
            commentText.trim();


          if (!text) {
            return;
          }


          const videoId =
            commentVideo?._id ||
            commentVideo?.id;


          if (!videoId) {
            return;
          }


          const safeVideoId =
            String(videoId);


          try {

            setCommentSending(
              true,
            );


            const response =
              await fetch(
                `${API_BASE_URL}/comments`,
                {
                  method:
                    'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body:
                    JSON.stringify({
                      userId:
                        user._id,

                      videoId:
                        safeVideoId,

                      text,
                    }),
                },
              );


            const raw =
              await response.text();


            let data: any = null;


            try {

              data =
                raw
                  ? JSON.parse(raw)
                  : null;

            } catch {

              data = {
                raw,
              };
            }


            if (!response.ok) {

              throw new Error(
                data?.error ||
                  'Erro ao publicar comentário',
              );
            }


            if (data?.comment) {

              setComments(
                current => [
                  ...current,
                  data.comment,
                ],
              );
            }


            setCommentText(
              '',
            );


            if (
              commentedThisViewRef.current.videoId ===
              safeVideoId
            ) {

              commentedThisViewRef.current.commented =
                true;
            }


            console.log(
              '💬 comentário publicado:',
              {
                videoId:
                  safeVideoId,

                commentId:
                  data?.comment?.id ||
                  data?.comment?._id,
              },
            );


          } catch (err) {

            console.log(
              '❌ erro ao publicar comentário:',
              err,
            );

            Alert.alert(
              'Erro',
              'Não foi possível publicar o comentário.',
            );

          } finally {

            setCommentSending(
              false,
            );
          }

        },
        [
          user?._id,
          commentVideo,
          commentSending,
          commentText,
        ],
      );


    // ========================================================
    // BUSCAR FEED
    // ========================================================

   const fetchVideos =
  useCallback(
    async (
      isRefresh = false,
    ) => {

      if (
        !user?._id ||
        fetchLockRef.current
      ) {
        return;
      }

      fetchLockRef.current =
        true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingFeed(true);
      }

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/feed/${user._id}`,
          );

        const raw =
          await response.text();

        let data: any = null;

        try {

          data = raw
            ? JSON.parse(raw)
            : null;

        } catch {

          throw new Error(
            `Resposta inválida do feed: ${raw.slice(
              0,
              150,
            )}`,
          );

        }

        if (!response.ok) {

          throw new Error(
            `Feed retornou HTTP ${response.status}`,
          );

        }

        // ==================================================
        // 🧠 DECISÃO DO CONTRA-ALGORITMO
        // ==================================================

        const decision: FeedDecision = {

          state:
            data?.state ||
            'normal',

          action:
            data?.action ||
            'none',

          intervention:
            data?.intervention ||
            null,

          feedStrategy:
            data?.feedStrategy ||
            null,

        };

        setFeedDecision(
          decision
        );

        console.log(
          '🧠 FEED DECISION:',
          decision
        );

        // ==================================================
        // 🎯 INTERVENÇÃO
        // ==================================================

        if (decision.intervention) {

          console.log(
            '💬 INTERVENÇÃO RECEBIDA:',
            decision.intervention,
          );

          const currentAction =
            decision.action || null;

          const alreadyShown =
            interventionShownRef.current ===
            currentAction;

          if (!alreadyShown) {

            interventionShownRef.current =
              currentAction;

            setInterventionVisible(true);

            if (
              interventionTimerRef.current
            ) {
              clearTimeout(
                interventionTimerRef.current,
              );
            }

            interventionTimerRef.current =
              setTimeout(() => {
                setInterventionVisible(false);
              }, 7000);
          }

        } else {

          setInterventionVisible(false);
          interventionShownRef.current = null;
        }

        // ==================================================
        // 🧠 SCORE
        // ==================================================

        console.log(
          '🧠 SCORE:',
          data?.score
        );

        // ==================================================
        // 🎥 FEED
        // ==================================================

        const feed =
          Array.isArray(
            data?.feed
          )
            ? data.feed
            : [];

        // ==================================================
        // NORMALIZAÇÃO
        // ==================================================

        const normalizedFeed =
          feed.map(
            (
              video: any,
              index: number,
            ) => ({

              ...video,

              id: String(
                video?._id ||
                video?.id ||
                `video-${index}`,
              ),

              duration:
                normalizeDuration(
                  video?.duration,
                ),

              stimulusLevel:
                safeStimulus(
                  video?.stimulusLevel,
                ),

              tags:
                Array.isArray(
                  video?.tags,
                )
                  ? video.tags
                  : [],

            }),
          );

        // ==================================================
        // ❤️ SINCRONIZAR LIKES DO FEED
        // ==================================================

        likedVideoIdsRef.current =
          new Set(
            normalizedFeed
              .filter(
                video =>
                  video.likedByMe === true,
              )
              .map(
                video =>
                  getVideoId(video),
              ),
          );


        console.log(
          '🎥 vídeos recebidos:',
          normalizedFeed.length,
        );

        console.log(
          '🎯 estratégia aplicada:',
          decision.feedStrategy
        );

        setVideos(
          normalizedFeed
        );

        setActiveIndex(
          current =>
            normalizedFeed.length === 0
              ? 0
              : Math.min(
                  current,
                  normalizedFeed.length - 1,
                ),
        );

      } catch (err) {

        console.log(
          '❌ erro ao buscar vídeos:',
          err,
        );

      } finally {

        fetchLockRef.current =
          false;

        setLoadingFeed(false);
        setRefreshing(false);

      }

    },
    [user?._id],
  );

    // ========================================================
    // CARREGAMENTO
    //
    // Um único efeito.
    //
    // Isso elimina o antigo:
    // fetchVideos() + fetchVideos()
    // ========================================================

    useEffect(() => {

      if (
        !user?._id ||
        !isFocused
      ) {
        return;
      }


      if (
        !hasLoadedFeedRef.current
      ) {

        void fetchVideos();
      }

    }, [
      user?._id,
      isFocused,
      fetchVideos,
    ]);


    // ========================================================
    // VOLTOU / SAIU DA TELA
    // ========================================================

    useEffect(() => {

      if (!isFocused) {

        finishCurrentVideo();

      }

    }, [
      isFocused,
      finishCurrentVideo,
    ]);


    // ========================================================
    // CLEANUP
    // ========================================================

    useEffect(() => {

      return () => {

        finishCurrentVideo();

        if (interventionTimerRef.current) {
          clearTimeout(
            interventionTimerRef.current,
          );
        }

      };

    }, [
      finishCurrentVideo,
    ]);


    // ========================================================
    // SELECIONAR VÍDEO
    // ========================================================

    const pickVideo =
      useCallback(
        async () => {

          try {

            const permission =
              await ImagePicker
                .requestMediaLibraryPermissionsAsync();


            if (
              !permission.granted
            ) {

              Alert.alert(
                'Permissão necessária',
                'Permita o acesso à galeria para selecionar um vídeo.',
              );

              return;
            }


            const result =
              await ImagePicker
                .launchImageLibraryAsync(
                  {
                    mediaTypes: ['videos'],

                    allowsEditing:
                      false,

                    quality: 1,
                  },
                );


            if (
              result.canceled ||
              !result.assets?.length
            ) {
              return;
            }


            const asset =
              result.assets[0];


            console.log(
              '🎬 vídeo selecionado:',
              {
                uri:
                  asset.uri,

                duration:
                  asset.duration,

                fileName:
                  asset.fileName,

                mimeType:
                  asset.mimeType,
                fileSize:
                  (asset as any).fileSize,
              },
            );


            // Desativa o player do feed antes de abrir o editor.
            // Isso evita dois players de vídeo pesados simultaneamente.
            finishCurrentVideo();

            setSelectedVideo(
              {
                uri:
                  asset.uri,

                duration:
                  asset.duration,

                fileName:
                  asset.fileName,

                mimeType:
                  asset.mimeType,

                fileSize:
                  (asset as any).fileSize,
              },
            );


            setDescription(
              '',
            );


            setModalVisible(
              true,
            );

          } catch (err) {

            console.log(
              '❌ erro ao selecionar vídeo:',
              err,
            );
          }

        },
        [finishCurrentVideo],
      );


    // ========================================================
    // FECHAR MODAL
    // ========================================================

    const closeUploadModal =
      useCallback(
        () => {

          if (loading) {
            return;
          }


          setModalVisible(
            false,
          );


          setSelectedVideo(
            null,
          );


          setDescription(
            '',
          );

        },
        [
          loading,
        ],
      );


    // ========================================================
    // UPLOAD
    // ========================================================

    const handleUpload =
      useCallback(
        async () => {

          if (
            !selectedVideo ||
            !user?._id ||
            loading
          ) {
            return;
          }


          try {

            Keyboard.dismiss();

            setLoading(
              true,
            );


            const duration =
              normalizeDuration(
                selectedVideo.duration,
              );


            console.log(
              '⏱ duração upload:',
              duration,
            );

            if (duration > 180) {
              throw new Error('O vídeo deve ter no máximo 3 minutos.');
            }


            const formData =
              new FormData();


            const extension =
              selectedVideo.mimeType
                ?.split('/')
                ?.pop() ||
              'mp4';


            formData.append(
              'file',
              {
                uri:
                  selectedVideo.uri,

                name:
                  selectedVideo.fileName ||
                  `video.${extension}`,

                type:
                  selectedVideo.mimeType ||
                  'video/mp4',

              } as any,
            );


            // ==================================================
            // 1. UPLOAD ARQUIVO
            // ==================================================

            console.log('📤 iniciando upload do arquivo...', {
              fileName: selectedVideo.fileName,
              mimeType: selectedVideo.mimeType,
              fileSizeMB: selectedVideo.fileSize
                ? Number((selectedVideo.fileSize / 1024 / 1024).toFixed(2))
                : null,
            });

            const uploadRes =
              await fetchWithTimeout(
                `${API_BASE_URL}/uploads/${user._id}/video`,
                {
                  method:
                    'POST',

                  body:
                    formData,
                },
              );


            const uploadRaw =
              await uploadRes.text();


            let uploadData: any;


            try {

              uploadData =
                uploadRaw
                  ? JSON.parse(
                      uploadRaw,
                    )
                  : null;

            } catch {

              throw new Error(
                `Resposta inválida no upload: ${uploadRaw.slice(
                  0,
                  150,
                )}`,
              );
            }


            if (
              !uploadRes.ok ||
              !uploadData?.url
            ) {

              throw new Error(
                uploadData?.error ||
                  uploadData?.message ||
                  `Falha no upload do vídeo (HTTP ${uploadRes.status}).`,
              );
            }


            console.log(
              '✅ arquivo enviado:',
              uploadData.url,
            );


            // ==================================================
            // 2. SALVAR VÍDEO NO BANCO
            // ==================================================

            const videoRes =
              await fetchWithTimeout(
                `${API_BASE_URL}/videos`,
                {
                  method:
                    'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body:
                    JSON.stringify(
                      {
                        userId:
                          user._id,

                        uri:
                          uploadData.url,

                        description:
                          description.trim(),

                        duration,
                      },
                    ),
                },
              );


            const videoRaw =
              await videoRes.text();


            let videoData: any;


            try {

              videoData =
                videoRaw
                  ? JSON.parse(
                      videoRaw,
                    )
                  : null;

            } catch {

              throw new Error(
                `Resposta inválida ao criar vídeo: ${videoRaw.slice(
                  0,
                  150,
                )}`,
              );
            }


            if (
              !videoRes.ok
            ) {

              console.log(
                '❌ erro criar vídeo:',
                videoData,
              );

              throw new Error(
                'Erro ao salvar vídeo.',
              );
            }


            console.log(
              '✅ vídeo criado:',
              videoData,
            );


            // ==================================================
            // 3. FECHAR
            // ==================================================

            setModalVisible(
              false,
            );


            setSelectedVideo(
              null,
            );


            setDescription(
              '',
            );


            // ==================================================
            // 4. ATUALIZAR FEED
            // ==================================================

            await fetchVideos(
              true,
            );


            Alert.alert(
              'Vídeo publicado!',
              'Seu vídeo foi processado e adicionado ao feed.',
            );


          } catch (err: any) {

            console.log(
              '❌ erro upload:',
              err,
            );


            const message =
              err?.name === 'AbortError'
                ? 'O upload demorou demais e foi interrompido. Tente novamente com um vídeo menor.'
                : err?.message ||
                  'Não foi possível publicar o vídeo.';

            Alert.alert(
              'Erro ao publicar',
              message,
            );


          } finally {

            setLoading(
              false,
            );
          }

        },
        [
          selectedVideo,
          user?._id,
          loading,
          description,
          fetchVideos,
        ],
      );


    // ========================================================
    // RENDER
    // ========================================================

    return (

      <View
        style={
          styles.screen
        }
      >

        {interventionVisible &&
          feedDecision.intervention && (
            <View
              pointerEvents="box-none"
              style={styles.interventionContainer}
            >
              <View style={styles.interventionCard}>

                <View style={styles.interventionIcon}>
                  <MaterialIcons
                    name={
                      feedDecision.action ===
                      'strong_intervention'
                        ? 'self-improvement'
                        : 'spa'
                    }
                    size={24}
                    color="#064D52"
                  />
                </View>

                <View style={styles.interventionContent}>
                  <Text style={styles.interventionTitle}>
                    {feedDecision.action ===
                    'strong_intervention'
                      ? 'Hora de desacelerar'
                      : 'Que tal uma pausa?'}
                  </Text>

                  <Text style={styles.interventionText}>
                    {feedDecision.intervention}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    setInterventionVisible(false)
                  }
                  style={styles.interventionClose}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color="#064D52"
                  />
                </TouchableOpacity>

              </View>
            </View>
          )}

        <FlatList
          data={videos}

          keyExtractor={(
            item,
            index,
          ) =>
            getVideoId(
              item,
              index,
            )
          }

          renderItem={({
            item,
            index,
          }) => (

            <VideoItem
              item={item}
              index={index}

              isActive={
                index === activeIndex &&
                !modalVisible &&
                !commentModalVisible &&
                isFocused
              }

              isFocused={
                isFocused
              }

              liked={
                item.likedByMe === true
              }

              onToggleLike={
                toggleLike
              }

              onOpenComments={
                openComments
              }

              onShare={
                shareVideo
              }
            />

          )}

          pagingEnabled

          showsVerticalScrollIndicator={
            false
          }

          onViewableItemsChanged={
            onViewRef.current
          }

          viewabilityConfig={
            viewabilityConfig
          }

          /*
           * Apenas o item necessário.
           *
           * Os itens continuam existindo
           * como células da FlatList, mas
           * não criam VideoPlayer.
           */

          initialNumToRender={
            1
          }

          maxToRenderPerBatch={
            1
          }

          windowSize={
            2
          }

          updateCellsBatchingPeriod={
            80
          }

          removeClippedSubviews={
            Platform.OS === 'android'
          }

          refreshing={
            refreshing
          }

          onRefresh={() =>
            void fetchVideos(
              true,
            )
          }

          getItemLayout={(
            _data,
            index,
          ) => ({
            length:
              height,

            offset:
              height * index,

            index,
          })}

          ListEmptyComponent={

            loadingFeed ? (

              <View
                style={
                  styles.emptyState
                }
              >

                <ActivityIndicator
                  size="large"
                  color="#9CE8EA"
                />

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Carregando vídeos...
                </Text>

              </View>

            ) : (

              <View
                style={
                  styles.emptyState
                }
              >

                <MaterialIcons
                  name="videocam-off"
                  size={54}
                  color="#fff"
                />

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Nenhum vídeo disponível.
                </Text>

                <Text
                  style={
                    styles.emptySubtext
                  }
                >
                  Seja o primeiro a publicar.
                </Text>

              </View>

            )

          }

        />


        {/* ==================================================
            💬 MODAL DE COMENTÁRIOS
        ================================================== */}

        <Modal
          visible={
            commentModalVisible
          }
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={
            closeComments
          }
        >

          <KeyboardAvoidingView
            style={
              styles.commentsModalRoot
            }
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : 'height'
            }
          >

            <View
              style={
                styles.commentsContainer
              }
            >

              <View
                style={
                  styles.commentsHeader
                }
              >

                <Text
                  style={
                    styles.commentsTitle
                  }
                >
                  Comentários
                </Text>


                <Pressable
                  onPress={
                    closeComments
                  }
                  style={
                    styles.commentsCloseButton
                  }
                >

                  <MaterialIcons
                    name="close"
                    size={24}
                    color="#222"
                  />

                </Pressable>

              </View>


              {commentsLoading ? (

                <View
                  style={
                    styles.commentsLoading
                  }
                >

                  <ActivityIndicator
                    size="large"
                    color="#007B83"
                  />

                  <Text
                    style={
                      styles.commentsLoadingText
                    }
                  >
                    Carregando comentários...
                  </Text>

                </View>

              ) : (

                <FlatList
                  data={
                    comments
                  }

                  keyExtractor={(
                    item,
                    index,
                  ) =>
                    String(
                      item.id ||
                      item._id ||
                      `comment-${index}`,
                    )
                  }

                  style={
                    styles.commentsList
                  }

                  contentContainerStyle={
                    comments.length === 0
                      ? styles.commentsEmptyList
                      : styles.commentsListContent
                  }

                  keyboardShouldPersistTaps="handled"

                  renderItem={({
                    item,
                  }) => {

                    const commentUserName =
                      item.userName ||
                      'Usuário';


                    return (

                      <View
                        style={
                          styles.commentItem
                        }
                      >

                        <View
                          style={
                            styles.commentAvatar
                          }
                        >

                          <Text
                            style={
                              styles.commentAvatarText
                            }
                          >
                            {commentUserName
                              .charAt(0)
                              .toUpperCase()}
                          </Text>

                        </View>


                        <View
                          style={
                            styles.commentContent
                          }
                        >

                          <Text
                            style={
                              styles.commentUserName
                            }
                          >
                            @{commentUserName}
                          </Text>


                          <Text
                            style={
                              styles.commentBodyText
                            }
                          >
                            {item.text}
                          </Text>

                        </View>

                      </View>

                    );
                  }}

                  ListEmptyComponent={

                    <View
                      style={
                        styles.commentsEmpty
                      }
                    >

                      <MaterialIcons
                        name="chat-bubble-outline"
                        size={42}
                        color="#9aa0a6"
                      />

                      <Text
                        style={
                          styles.commentsEmptyTitle
                        }
                      >
                        Nenhum comentário ainda
                      </Text>

                      <Text
                        style={
                          styles.commentsEmptyText
                        }
                      >
                        Seja o primeiro a comentar.
                      </Text>

                    </View>

                  }
                />

              )}


              <View
                style={
                  styles.commentComposer
                }
              >

                <TextInput
                  value={
                    commentText
                  }

                  onChangeText={
                    setCommentText
                  }

                  placeholder="Adicione um comentário..."
                  placeholderTextColor="#888"

                  style={
                    styles.commentInput
                  }

                  multiline
                  maxLength={500}

                  editable={
                    !commentSending
                  }
                />


                <TouchableOpacity
                  activeOpacity={0.8}

                  onPress={
                    submitComment
                  }

                  disabled={
                    commentSending ||
                    !commentText.trim()
                  }

                  style={[
                    styles.commentSendButton,

                    (
                      commentSending ||
                      !commentText.trim()
                    ) &&
                      styles.commentSendButtonDisabled,
                  ]}
                >

                  {commentSending ? (

                    <ActivityIndicator
                      size="small"
                      color="#fff"
                    />

                  ) : (

                    <MaterialIcons
                      name="send"
                      size={22}
                      color="#fff"
                    />

                  )}

                </TouchableOpacity>

              </View>

            </View>

          </KeyboardAvoidingView>

        </Modal>


        {/* ==================================================
            BOTÃO UPLOAD
        ================================================== */}

        <TouchableOpacity
          activeOpacity={0.85}
          style={
            styles.uploadButton
          }
          onPress={
            pickVideo
          }
        >

          <MaterialIcons
            name="add"
            size={32}
            color="#fff"
          />

        </TouchableOpacity>


        {/* ==================================================
            MODAL UPLOAD
        ================================================== */}

        <Modal
          visible={
            modalVisible
          }
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={
            closeUploadModal
          }
        >

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios'
                  ? 'interactive'
                  : 'on-drag'
              }
              showsVerticalScrollIndicator={false}
            >

          <View
            style={
              styles.modalContainer
            }
          >

            {/* HEADER */}

            <View
              style={
                styles.modalHeader
              }
            >

              <Text
                style={
                  styles.modalTitle
                }
              >
                Novo vídeo
              </Text>


              <Pressable
                disabled={
                  loading
                }
                onPress={
                  closeUploadModal
                }
                style={
                  styles.closeButton
                }
              >

                <MaterialIcons
                  name="close"
                  size={26}
                  color="#222"
                />

              </Pressable>

            </View>


            {/* PREVIEW */}

            {selectedVideo && !loading && (

              <View
                style={
                  styles.previewWrapper
                }
              >

                <UploadPreview
                  uri={
                    selectedVideo.uri
                  }

                  isPlaying={
                    !loading
                  }
                />


                {selectedVideo.duration ? (

                  <View
                    style={
                      styles.durationBadge
                    }
                  >

                    <MaterialIcons
                      name="schedule"
                      size={15}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.durationText
                      }
                    >
                      {normalizeDuration(
                        selectedVideo.duration,
                      ).toFixed(1)}
                      s
                    </Text>

                  </View>

                ) : null}

              </View>

            )}


            {/* DESCRIÇÃO */}

            <Text
              style={
                styles.inputLabel
              }
            >
              Descrição
            </Text>


            <TextInput
              placeholder="Conte o que está acontecendo no vídeo..."
              placeholderTextColor="#888"

              value={
                description
              }

              onChangeText={
                setDescription
              }

              style={
                styles.input
              }

              multiline

              maxLength={
                500
              }

              editable={
                !loading
              }
            />


            <Text
              style={
                styles.characterCount
              }
            >
              {description.length}/500
            </Text>


            {/* PUBLICAR */}

            <TouchableOpacity
              activeOpacity={0.85}

              style={[
                styles.postButton,

                loading &&
                  styles.postButtonDisabled,
              ]}

              onPress={
                handleUpload
              }

              disabled={
                loading
              }
            >

              {loading ? (

                <>

                  <ActivityIndicator
                    color="#fff"
                    size="small"
                  />

                  <Text
                    style={
                      styles.postText
                    }
                  >
                    Processando vídeo...
                  </Text>

                </>

              ) : (

                <>

                  <MaterialIcons
                    name="cloud-upload"
                    size={22}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.postText
                    }
                  >
                    Publicar vídeo
                  </Text>

                </>

              )}

            </TouchableOpacity>


            {loading && (

              <Text
                style={
                  styles.processingText
                }
              >
                O vídeo está sendo enviado e analisado
                pela IA. Isso pode levar alguns segundos.
              </Text>

            )}

          </View>

            </ScrollView>

          </KeyboardAvoidingView>

        </Modal>

      </View>
    );
  };


export default VideoScreen;


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // TELA
    // ========================================================

    screen: {
      flex: 1,
      backgroundColor: '#000',
    },


    // ========================================================
    // VÍDEO
    // ========================================================

    videoContainer: {
      width: width,
      height: height,
      backgroundColor: '#000',
      position: 'relative',
    },


    video: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
    },


    // ========================================================
    // AÇÕES
    // ========================================================

    actions: {
      position: 'absolute',
      right: spacing.sm,
      bottom: sizes.bottomTabBarReservedSpace + spacing.md,
      alignItems: 'center',
      gap: 18,
    },


    actionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 52,
    },


    volumeButton: {
      marginTop: 4,
    },


    actionLabel: {
      color: '#fff',
      fontSize: 10,
      marginTop: 3,
      fontWeight: '600',

      textShadowColor:
        'rgba(0,0,0,0.7)',

      textShadowOffset: {
        width: 0,
        height: 1,
      },

      textShadowRadius: 3,
    },


    // ========================================================
    // OVERLAY
    // ========================================================

    overlay: {
      position: 'absolute',
      left: spacing.md,
      right: sizes.touchTarget + spacing.lg,
      bottom: sizes.bottomTabBarReservedSpace + spacing.md,
    },

    contentScrim: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 0,
      height: height * 0.48,
    },


    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 9,
    },


    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,

      backgroundColor:
        '#9CE8EA',

      justifyContent: 'center',
      alignItems: 'center',

      marginRight: 9,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.8)',
    },


    avatarText: {
      color: '#064D52',
      fontSize: 17,
      fontWeight: '800',
    },


    user: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
      flex: 1,

      textShadowColor:
        'rgba(0,0,0,0.8)',

      textShadowOffset: {
        width: 0,
        height: 1,
      },

      textShadowRadius: 4,
    },


    description: {
      color: '#fff',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',

      textShadowColor:
        'rgba(0,0,0,0.85)',

      textShadowOffset: {
        width: 0,
        height: 1,
      },

      textShadowRadius: 4,
    },


    categoryBadge: {
      alignSelf: 'flex-start',
      marginTop: 10,

      paddingHorizontal: 10,
      paddingVertical: 5,

      borderRadius: 14,

      backgroundColor:
        'rgba(156,232,234,0.88)',
    },


    categoryText: {
      color: '#064D52',
      fontSize: 11,
      fontWeight: '800',
    },


    // ========================================================
    // ERRO
    // ========================================================

    videoError: {
      position: 'absolute',

      top: 0,
      left: 0,
      right: 0,
      bottom: 0,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(0,0,0,0.55)',

      paddingHorizontal: 40,
    },


    videoErrorText: {
      color: '#fff',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },


    // ========================================================
    // INTERVENÇÃO
    // ========================================================

    interventionContainer: {
      position: 'absolute',
      top: Platform.OS === 'android' ? 34 : 50,
      left: 14,
      right: 14,
      zIndex: 12000,
      alignItems: 'center',
    },

    interventionCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 8,
    },

    interventionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#a8edea',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    interventionContent: {
      flex: 1,
    },

    interventionTitle: {
      color: '#064D52',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },

    interventionText: {
      color: '#333',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '500',
    },

    interventionClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },

    // ========================================================
    // BOTÃO UPLOAD
    // ========================================================

    uploadButton: {
  position: 'absolute',

  right: spacing.md,
  top: Platform.OS === 'android' ? sizes.bottomTabBarReservedSpace : sizes.bottomTabBarReservedSpace + spacing.md,

  width: 62,
  height: 62,

  borderRadius: 31,

  backgroundColor: '#007B83',

  justifyContent: 'center',
  alignItems: 'center',

  zIndex: 9999,
  elevation: 15,

  shadowColor: '#000',
  shadowOpacity: 0.35,
  shadowRadius: 10,

  shadowOffset: {
    width: 0,
    height: 5,
  },
},


    // ========================================================
    // ESTADO VAZIO
    // ========================================================

    emptyState: {
      height,
      width,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor: '#000',

      paddingHorizontal: 30,
    },


    emptyText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',

      marginTop: 16,

      textAlign: 'center',
    },


    emptySubtext: {
      color: '#aaa',
      fontSize: 14,

      marginTop: 6,

      textAlign: 'center',
    },


    // ========================================================
    // 💬 COMENTÁRIOS
    // ========================================================

    commentsModalRoot: {
      flex: 1,
      backgroundColor: '#fff',
    },


    commentsContainer: {
      flex: 1,
      backgroundColor: '#fff',
      paddingTop:
        Platform.OS === 'android'
          ? 18
          : 8,
    },


    commentsHeader: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#eceff1',
    },


    commentsTitle: {
      color: '#123',
      fontSize: 20,
      fontWeight: '800',
    },


    commentsCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f3f4',
    },


    commentsLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },


    commentsLoadingText: {
      marginTop: 12,
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
    },


    commentsList: {
      flex: 1,
    },


    commentsListContent: {
      paddingHorizontal: 18,
      paddingVertical: 14,
    },


    commentsEmptyList: {
      flexGrow: 1,
    },


    commentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 18,
    },


    commentAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#a8edea',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },


    commentAvatarText: {
      color: '#064D52',
      fontSize: 15,
      fontWeight: '800',
    },


    commentContent: {
      flex: 1,
      paddingTop: 2,
    },


    commentUserName: {
      color: '#222',
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 3,
    },


    commentBodyText: {
      color: '#333',
      fontSize: 14,
      lineHeight: 19,
    },


    commentsEmpty: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },


    commentsEmptyTitle: {
      marginTop: 12,
      color: '#333',
      fontSize: 16,
      fontWeight: '800',
    },


    commentsEmptyText: {
      marginTop: 5,
      color: '#777',
      fontSize: 13,
      textAlign: 'center',
    },


    commentComposer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom:
        Platform.OS === 'ios'
          ? 18
          : 12,
      borderTopWidth: 1,
      borderTopColor: '#eceff1',
      backgroundColor: '#fff',
    },


    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      borderRadius: 22,
      backgroundColor: '#f1f3f4',
      color: '#222',
      fontSize: 14,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      textAlignVertical: 'top',
    },


    commentSendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#007B83',
      alignItems: 'center',
      justifyContent: 'center',
    },


    commentSendButtonDisabled: {
      opacity: 0.45,
    },


    // ========================================================
    // MODAL
    // ========================================================

    keyboardAvoidingView: {
      flex: 1,
    },

    modalScroll: {
      flex: 1,
    },

    modalScrollContent: {
      flexGrow: 1,
      paddingBottom: 28,
    },

    modalContainer: {
      flex: 1,

      backgroundColor: '#fff',

      paddingHorizontal: 20,

      paddingTop:
        Platform.OS === 'android'
          ? 20
          : 10,
    },


    modalHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 18,
    },


    modalTitle: {
      fontSize: 25,
      fontWeight: '800',
      color: '#123',
    },


    closeButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      backgroundColor:
        '#f1f3f4',

      justifyContent: 'center',
      alignItems: 'center',
    },


    // ========================================================
    // PREVIEW
    // ========================================================

    previewWrapper: {
      width: '100%',
      height: 360,

      borderRadius: 20,

      overflow: 'hidden',

      backgroundColor: '#111',

      marginBottom: 22,

      position: 'relative',
    },


    preview: {
      width: '100%',
      height: '100%',
      backgroundColor: '#111',
    },


    durationBadge: {
      position: 'absolute',

      right: 12,
      bottom: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      backgroundColor:
        'rgba(0,0,0,0.65)',

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 12,
    },


    durationText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },


    // ========================================================
    // INPUT
    // ========================================================

    inputLabel: {
      color: '#123',
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 7,
    },


    input: {
      minHeight: 110,
      maxHeight: 160,

      backgroundColor:
        '#f4f5f6',

      borderRadius: 16,

      paddingHorizontal: 15,
      paddingVertical: 13,

      color: '#222',

      fontSize: 15,

      textAlignVertical: 'top',

      borderWidth: 1,

      borderColor:
        '#e4e6e7',
    },


    characterCount: {
      color: '#888',
      fontSize: 11,

      textAlign: 'right',

      marginTop: 5,
    },


    // ========================================================
    // BOTÃO PUBLICAR
    // ========================================================

    postButton: {
      marginTop: 22,

      minHeight: 55,

      borderRadius: 18,

      backgroundColor:
        '#007B83',

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 9,

      elevation: 3,
    },


    postButtonDisabled: {
      opacity: 0.7,
    },


    postText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },


    processingText: {
      marginTop: 12,

      color: '#777',

      fontSize: 12,

      lineHeight: 17,

      textAlign: 'center',

      paddingHorizontal: 20,
    },

  });
