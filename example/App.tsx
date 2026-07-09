import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Button, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SubjectMask from 'react-native-subject-mask';

export default function App() {
  const supported = SubjectMask.isSupported();
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubjectMask.SubjectLiftResult | null>(null);

  async function pickAndIsolate() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled) return;

    setBusy(true);
    setError(null);
    setResult(null);
    const startedAt = Date.now();
    try {
      const isolated = await SubjectMask.isolateSubject(picked.assets[0].uri);
      setElapsedMs(Date.now() - startedAt);
      setResult(isolated);
    } catch (e) {
      const err = e as Error & { code?: string };
      setError(`${err.code ?? 'ERR_UNKNOWN'}: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.container}>
          <Text style={styles.header}>react-native-subject-mask</Text>
          <Group name="isSupported()">
            <Text>{supported ? 'true — subject lifting available' : 'false — needs iOS 17+'}</Text>
          </Group>
          <Group name="isolateSubject()">
            <Button title="Pick a photo" onPress={pickAndIsolate} disabled={!supported || busy} />
            {busy && <ActivityIndicator style={styles.spacer} />}
            {error && <Text style={styles.error}>{error}</Text>}
            {result && (
              <View>
                <Text style={styles.spacer}>
                  {result.imageWidth}×{result.imageHeight} in {elapsedMs}ms — outline{' '}
                  {result.outlineSvg ? `${result.outlineSvg.length} chars` : 'null'}
                </Text>
                <View
                  style={[styles.preview, { aspectRatio: result.imageWidth / result.imageHeight }]}>
                  <Image source={{ uri: result.imageUri }} style={styles.layer} />
                  {/* The dim mask is transparent over the subject; tinting its
                      opaque (background) pixels black previews the dim effect. */}
                  <Image
                    source={{ uri: result.dimMaskUri }}
                    style={[styles.layer, styles.dimLayer]}
                  />
                </View>
              </View>
            )}
          </Group>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = {
  header: { fontSize: 30, margin: 20 },
  groupHeader: { fontSize: 20, marginBottom: 20 },
  group: { margin: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  container: { flex: 1, backgroundColor: '#eee' },
  spacer: { marginTop: 12 },
  error: { marginTop: 12, color: '#c00' },
  preview: { marginTop: 12, width: '100%' as const },
  layer: { position: 'absolute' as const, width: '100%' as const, height: '100%' as const },
  dimLayer: { tintColor: 'black', opacity: 0.6 },
};
