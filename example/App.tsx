import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SubjectMask from 'react-native-subject-mask';
import { SubjectRevealImage } from 'react-native-subject-mask/skia';

export default function App() {
  const supported = SubjectMask.isSupported();
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [dimmed, setDimmed] = useState(true);
  const { result, error, loading, durationMs } = SubjectMask.useSubjectLift(pickedUri);

  async function pickPhoto() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled) return;
    setDimmed(true); // reveal plays as soon as the data lands
    setPickedUri(picked.assets[0].uri);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.container}>
          <Text style={styles.header}>react-native-subject-mask</Text>
          <Group name="isSupported()">
            <Text>{supported ? 'true — subject lifting available' : 'false — needs iOS 17+'}</Text>
          </Group>
          <Group name="useSubjectLift() + <SubjectRevealImage />">
            <Button title="Pick a photo" onPress={pickPhoto} disabled={!supported || loading} />
            {loading && <ActivityIndicator style={styles.spacer} />}
            {error && (
              <Text style={styles.error}>
                {error.code ?? 'ERR_UNKNOWN'}: {error.message}
              </Text>
            )}
            {result && (
              <View>
                <Text style={styles.spacer}>
                  {result.imageWidth}×{result.imageHeight} in {durationMs}ms — outline{' '}
                  {result.outlineSvg ? `${result.outlineSvg.length} chars` : 'null'}
                </Text>
                <SubjectRevealImage
                  result={result}
                  dimmed={dimmed}
                  style={[styles.preview, { aspectRatio: result.imageWidth / result.imageHeight }]}
                />
                <Button
                  title={dimmed ? 'Undim' : 'Replay reveal'}
                  onPress={() => setDimmed(!dimmed)}
                />
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
  preview: { marginTop: 12, marginBottom: 12, width: '100%' as const },
};
