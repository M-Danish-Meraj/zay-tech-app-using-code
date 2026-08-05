import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { WorkflowProvider } from './src/context/WorkflowContext';
import { GeneratorScreen } from './src/screens/GeneratorScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { COLORS } from './src/styles/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <WorkflowProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.spaceDark,
            },
            headerTintColor: COLORS.white,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 16,
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen 
            name="Generator" 
            component={GeneratorScreen}
            options={({ navigation }) => ({
              headerTitle: 'AI Creator Workspace',
              headerRight: () => (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('History')}
                  style={styles.navButton}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.spaceBlue} />
                  <Text style={styles.navButtonText}>History</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen}
            options={{
              headerTitle: 'Approved History',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </WorkflowProvider>
  );
}

const styles = StyleSheet.create({
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  navButtonText: {
    color: COLORS.spaceBlue,
    fontSize: 12,
    fontWeight: '600',
  },
});
