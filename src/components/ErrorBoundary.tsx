import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0c', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: '#f87171', marginBottom: 12 }}>RENDER ERROR</Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 10, color: '#909099', textAlign: 'center', marginBottom: 24 }} numberOfLines={4}>
            {this.state.error.message}
          </Text>
          <Pressable onPress={() => this.setState({ error: null })}
            style={{ borderWidth: 1, borderColor: '#4A7FC1', paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, color: '#4A7FC1' }}>RETRY</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
