import * as SubjectMask from 'react-native-subject-mask';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function App() {
  const supported = SubjectMask.isSupported();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>react-native-subject-mask</Text>
        <Group name="isSupported()">
          <Text>{supported ? 'true — subject lifting available' : 'false — needs iOS 17+'}</Text>
        </Group>
      </ScrollView>
    </SafeAreaView>
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
};
