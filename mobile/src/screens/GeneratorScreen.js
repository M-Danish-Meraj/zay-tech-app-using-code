import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useWorkflow } from '../context/WorkflowContext';
import { apiService } from '../api/apiService';
import { CosmicBackground } from '../components/CosmicBackground';
import { Toast } from '../components/Toast';
import { COLORS, SHADOWS } from '../styles/theme';

const loadingStatuses = [
  "Understanding your request...",
  "Preparing your brand assets...",
  "Creating your visual...",
  "Generating your caption...",
  "Finalizing your post...",
  "Almost ready..."
];

export const GeneratorScreen = () => {
  const { state, dispatch } = useWorkflow();
  const { workflowState, prompt, generationResult, errorMessage } = state;

  const [inputText, setInputText] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('success');

  // Shared values for Reanimated loaders
  const spinVal = useSharedValue(0);
  const pulseVal = useSharedValue(1);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  // Cycle loading messages
  useEffect(() => {
    let interval;
    if (workflowState === 'GENERATING' || workflowState === 'REGENERATING') {
      setStatusIndex(0);
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
      }, 2500);

      // Start Reanimated loops
      spinVal.value = withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.linear }),
        -1,
        false
      );
      pulseVal.value = withRepeat(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
    return () => {
      clearInterval(interval);
      spinVal.value = 0;
      pulseVal.value = 1;
    };
  }, [workflowState]);

  /*const handleGenerate = async () => {
    if (inputText.trim().length < 5) {
      showToast('Prompt must be at least 5 characters long', 'error');
      return;
    }
    
    dispatch({ type: 'SET_PROMPT', payload: inputText });
    dispatch({ type: 'SET_STATE', payload: 'GENERATING' });
    
    try {
      const response = await apiService.generatePost(inputText);
      dispatch({ type: 'SET_RESULT', payload: response[0] });
      showToast('Post generated successfully! ✨');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "We couldn't generate your post. Please try again.";
      dispatch({ type: 'SET_ERROR', payload: errMsg });
      showToast("We couldn't generate your post.", 'error');
    }
  };*/
  const handleGenerate = async () => {
    if (inputText.trim().length < 5) {
      showToast('Prompt must be at least 5 characters long', 'error');
      return;
    }

    dispatch({ type: 'SET_PROMPT', payload: inputText });
    dispatch({ type: 'SET_STATE', payload: 'GENERATING' });

    try {
      const response = await apiService.generatePost(inputText);

      console.log("API RESPONSE:");
      console.log(response);
      console.log(JSON.stringify(response, null, 2));
      dispatch({
        type: 'SET_RESULT',
        payload: response,
      });

      setTimeout(() => {
        console.log("STATE AFTER DISPATCH");
        console.log(generationResult);
      }, 1000);

      console.log("DISPATCHED:");
      console.log(response);

      showToast('Post generated successfully! ✨');
    } catch (err) {
      console.log("FULL ERROR:");
      console.log(err);

      if (err.response) {
        console.log("Response:");
        console.log(err.response.data);
      }

      if (err.request) {
        console.log("Request made but no response received.");
      }

      console.log(err.message);

      const errMsg =
        err.response?.data?.error ||
        err.message ||
        "We couldn't generate your post. Please try again.";

      dispatch({ type: 'SET_ERROR', payload: errMsg });
      showToast(errMsg, 'error');
    }
  };

  // Keep this debug log outside the function
  console.log("workflowState =", workflowState);
  console.log("generationResult =", generationResult);

  const handleApprove = async () => {
    if (!generationResult || workflowState === 'APPROVING') return;

    dispatch({ type: 'SET_STATE', payload: 'APPROVING' });



    try {
      await apiService.approvePost({
        generationId: generationResult.generationId,
        resumeUrl: generationResult.resumeUrl,
        imageUrl: generationResult.imageUrl,
        imageName: generationResult.imageName,
        caption: generationResult.caption
      });
      dispatch({ type: 'SET_APPROVED' });
      showToast('Post approved and saved successfully ✨');
    } catch (err) {
      console.error(err);
      dispatch({ type: 'SET_RESULT', payload: generationResult });
      showToast('Your post could not be approved. Please try again.', 'error');
    }
  };

  const handleReject = async () => {
    if (!generationResult || workflowState === 'REJECTING' || workflowState === 'REGENERATING') return;

    dispatch({ type: 'SET_STATE', payload: 'REGENERATING' });
    try {
      const response = await apiService.rejectPost(
        generationResult.generationId,
        generationResult.resumeUrl
      );
      dispatch({ type: 'SET_RESULT', payload: response });
      showToast('New version created! ✨');
    } catch (err) {
      console.error(err);
      dispatch({ type: 'SET_RESULT', payload: generationResult });
      showToast('Regeneration failed. Please try again.', 'error');
    }
  };

  const copyToClipboard = async () => {
    if (!generationResult) return;
    await Clipboard.setStringAsync(generationResult.caption);
    showToast('Caption copied!');
  };

  const startOver = () => {
    setInputText('');
    dispatch({ type: 'RESET' });
  };

  // Animated styles
  const spinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinVal.value * 360}deg` }],
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseVal.value }],
    };
  });

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <Toast
          message={toastMsg}
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
          type={toastType}
        />

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          {/* Header Title */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="sparkles" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.title}>AI Post Creator</Text>
            <Text style={styles.subtitle}>Compose visuals and captions instantly.</Text>
          </View>

          {/* Form State */}
          {(workflowState === 'IDLE' || workflowState === 'ERROR') && (
            <View style={[styles.card, SHADOWS.glass]}>
              <Text style={styles.cardHeader}>Create your next post ✨</Text>

              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Tell the AI what you want to create..."
                placeholderTextColor={COLORS.slate500}
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Prompt must be at least 5 chars</Text>
                <Text style={[styles.metaText, inputText.length > 900 ? styles.limitReached : null]}>
                  {inputText.length}/1000
                </Text>
              </View>

              {workflowState === 'ERROR' && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.red} />
                  <View style={styles.errorAlertContent}>
                    <Text style={styles.errorAlertTitle}>Generation Failed</Text>
                    <Text style={styles.errorAlertMsg}>{errorMessage}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.buttonGenerate} onPress={handleGenerate}>
                <Ionicons name="flash" size={16} color={COLORS.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Generate Post</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading States */}
          {(workflowState === 'GENERATING' || workflowState === 'REGENERATING') && (
            <View style={[styles.card, styles.centerCard, SHADOWS.glass]}>
              {/* Loader visual circles */}
              <View style={styles.animationWrapper}>
                <Animated.View style={[styles.rotatingRing, spinStyle]} />
                <Animated.View style={[styles.pulsingCore, pulseStyle]} />
              </View>

              <Text style={styles.loadingTitle}>
                {workflowState === 'REGENERATING' ? 'Revising Post...' : 'Designing Post...'}
              </Text>
              <Text style={styles.loadingSubtitle}>{loadingStatuses[statusIndex]}</Text>
            </View>
          )}

          {/* Generated Result Workspace */}
          {(workflowState === 'RESULT_READY' || workflowState === 'APPROVING' || workflowState === 'APPROVED') && generationResult && (
            <View style={styles.resultContainer}>

              {/* Media card */}
              <View style={[styles.card, SHADOWS.glass, { padding: 12 }]}>
               <View style={styles.imageWrapper}>

  <TouchableOpacity
    style={{ flex: 1 }}
    onPress={() => Linking.openURL(generationResult.imageUrl)}
  >
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
      }}
    >
      <Ionicons
        name="image-outline"
        size={70}
        color={COLORS.white}
      />

      <Text
        style={{
          color: COLORS.white,
          fontSize: 18,
          fontWeight: '700',
          marginTop: 12,
        }}
      >
        View Image
      </Text>

      <Text
        style={{
          color: COLORS.slate400,
          marginTop: 6,
          fontSize: 13,
        }}
      >
        Tap to open in browser
      </Text>
    </View>
  </TouchableOpacity>

  {generationResult.imageName && (
    <View style={styles.filenameTag}>
      <Text
        style={styles.filenameText}
        numberOfLines={1}
      >
        {generationResult.imageName}
      </Text>
    </View>
  )}

</View>
              </View>

              {/* Caption and controls */}
              <View style={[styles.card, SHADOWS.glass]}>
                <View style={styles.captionHeader}>
                  <Text style={styles.captionTitle}>Generated Caption</Text>
                  <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={14} color={COLORS.spacePink} />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.captionBox} nestedScrollEnabled>
                  <Text style={styles.captionText}>{generationResult.caption}</Text>
                </ScrollView>

                {workflowState === 'APPROVED' ? (
                  <View style={styles.approvedSection}>
                    <Text style={styles.approvedText}>Post approved and saved successfully ✨</Text>
                    <TouchableOpacity style={styles.buttonSecondary} onPress={startOver}>
                      <Text style={styles.buttonSecondaryText}>Create Another Post</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.buttonSecondary, { flex: 1 }]}
                      onPress={handleReject}
                      disabled={workflowState === 'APPROVING'}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
                      <Text style={[styles.buttonSecondaryText, { color: COLORS.red }]}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.buttonApprove, { flex: 1 }]}
                      onPress={handleApprove}
                      disabled={workflowState === 'APPROVING'}
                    >
                      {workflowState === 'APPROVING' ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                          <Text style={styles.buttonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {workflowState !== 'APPROVED' && workflowState !== 'APPROVING' && (
                <TouchableOpacity onPress={startOver} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>&larr; Start over with a new prompt</Text>
                </TouchableOpacity>
              )}

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.spacePink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate400,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate100,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: 'rgba(10, 10, 22, 0.4)',
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    color: COLORS.white,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'between',
    marginTop: 8,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.slate500,
  },
  limitReached: {
    color: COLORS.spacePink,
  },
  errorAlert: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
  },
  errorAlertContent: {
    marginLeft: 10,
    flex: 1,
  },
  errorAlertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.red,
  },
  errorAlertMsg: {
    fontSize: 11,
    color: COLORS.red,
    marginTop: 2,
  },
  buttonGenerate: {
    backgroundColor: COLORS.spacePink,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  centerCard: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 280,
    justifyContent: 'center',
  },
  animationWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  rotatingRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: COLORS.spacePink,
    borderStyle: 'dashed',
    borderRadius: 40,
  },
  pulsingCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192, 132, 252, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.spaceLavender,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate100,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: COLORS.spaceBlue,
    marginTop: 8,
    fontWeight: '500',
  },
  resultContainer: {
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1.77,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 22, 0.6)',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  filenameTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(10, 10, 22, 0.8)',
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '80%',
  },
  filenameText: {
    color: COLORS.slate300,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  captionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  captionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.spacePink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: COLORS.spacePink,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  captionBox: {
    backgroundColor: 'rgba(10, 10, 22, 0.4)',
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    maxHeight: 150,
    marginBottom: 16,
  },
  captionText: {
    color: COLORS.slate100,
    fontSize: 13,
    lineHeight: 20,
  },
  approvedSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 114, 182, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.2)',
    borderRadius: 12,
    padding: 14,
  },
  approvedText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.spacePink,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonSecondary: {
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  buttonSecondaryText: {
    color: COLORS.slate300,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonApprove: {
    backgroundColor: COLORS.spacePink,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  backBtnText: {
    color: COLORS.slate500,
    fontSize: 12,
  },
});
export default GeneratorScreen;
