/**
 * Tab Navigator
 * Navegação principal com bottom tabs usando ícones Lucide
 */

import { HomeScreen, QuizListScreen, ProfileScreen, StatsScreen } from "@/screens";
import { TabParamList } from "@/types";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Home, Gamepad2, BarChart3, User } from "lucide-react-native";

const Tab = createBottomTabNavigator<TabParamList>();

const ICON_SIZE = 24;
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

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    borderRadius: 20,
    borderTopWidth: 0,
    elevation: 0,
    paddingBottom: 10,
    paddingTop: 10,
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
