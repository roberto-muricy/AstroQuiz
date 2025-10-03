/**
 * Tab Navigator
 * Navegação principal com bottom tabs
 */

import { Icons } from "@/assets";
import { HomeScreen, ProfileScreen, StatsScreen } from "@/screens";
import { TabParamList } from "@/types";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

const Tab = createBottomTabNavigator<TabParamList>();

interface TabIconProps {
  icon: any;
  focused: boolean;
  color: string;
}

const TabIcon = ({ icon, focused, color }: TabIconProps) => (
  <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
    <Image
      source={icon}
      style={[styles.iconImage]}
      resizeMode="contain"
    />
  </View>
);

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#FFA726",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Icons.home} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={HomeScreen} // Temporário
        options={{
          tabBarLabel: "Quiz",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Icons.quiz} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: "Stats",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Icons.stats} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Icons.profile} focused={focused} color={color} />
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
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    marginTop: 4,
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
    backgroundColor: "rgba(255, 167, 38, 0.2)",
  },
  iconImage: {
    width: 24,
    height: 24,
  },
});
