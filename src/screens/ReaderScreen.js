import React from 'react';
import ContinuousReaderScreen from './ContinuousReaderScreen';
import PageReaderScreen from './PageReaderScreen';

export default function ReaderScreen({ navigation, route }) {
  const mode = route?.params?.mode || 'continuous';

  if (mode === 'pages') {
    return <PageReaderScreen navigation={navigation} route={route} />;
  }
  return <ContinuousReaderScreen navigation={navigation} route={route} />;
}
