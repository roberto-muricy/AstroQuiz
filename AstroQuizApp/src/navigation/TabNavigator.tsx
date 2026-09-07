/**
 * Tab Navigator
 * Navegação principal com bottom tabs usando ícones Lucide
 */

import { HomeScreen, QuizListScreen, ProfileScreen, StatsScreen } from "@/screens";
import { TabParamList } from "@/types";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Home, Gamepad2, BarChart3, User } from "lucide-react-native";

const Tab = createBottomTabNavigator<TabParamList>();

const ICON_SIZE = 24;
/** Altura util da barra, sem contar o recuo do sistema. */
const BARRA_ALTURA = 62;
const ACTIVE_COLOR = "#FFA726";
const INACTIVE_COLOR = "rgba(255, 255, 255, 0.5)";

interface TabIconProps {
  IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  focused: boolean;
  color: string;
}

const TabIcon = ({ IconComponent, focused, color }: TabIconProps) => (
  <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
    <IconComponent
      size={ICON_SIZE}
      color={focused ? ACTIVE_COLOR : color}
      strokeWidth={2}
    />
  </View>
);

export const TabNavigator = () => {
  const { t } = useTranslation();
  // A partir do targetSdk 35 o Android impoe edge-to-edge: o sistema desenha
  // atras das barras e cabe ao app recuar. Sem isto os rotulos das abas ficam
  // por baixo da barra de navegacao de tres botoes. No iOS o problema nao
  // aparecia porque a area segura de baixo ali e so o indicador de home.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: BARRA_ALTURA + insets.bottom, paddingBottom: insets.bottom },
        ],
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t("tabs.home"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon IconComponent={Home} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizListScreen}
        options={{
          tabBarLabel: t("tabs.quiz"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon IconComponent={Gamepad2} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t("tabs.stats"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon IconComponent={BarChart3} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t("tabs.profile"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon IconComponent={User} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    marginTop: 2,
  },
  tabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabIconActive: {
    backgroundColor: "rgba(255, 167, 38, 0.15)",
  },
});
