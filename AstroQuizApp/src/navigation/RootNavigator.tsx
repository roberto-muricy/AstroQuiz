/**
 * Root Navigator
 * Navegação principal do app com Stack
 * Abre direto nas tabs - login opcional via ProfileScreen
 */

import { LoginScreen, QuizScreen, QuizResultScreen } from '@/screens';
import { RootStackParamList } from '@/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="QuizGame"
        component={QuizScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="QuizResult"
        component={QuizResultScreen}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="LevelDetail"
        component={QuizScreen} // Temporário
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};


