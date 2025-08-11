import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const useStats = () => {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    activeUsers: 0,
    loading: true
  });

  useEffect(() => {
    let questionsUnsubscribe;
    let usersUnsubscribe;

    // Listener para perguntas
    questionsUnsubscribe = onSnapshot(
      collection(db, "questions"),
      (snapshot) => {
        const totalQuestions = snapshot.size;
        setStats(prev => ({ ...prev, totalQuestions }));
      },
      (error) => {
        console.error("Error fetching questions stats:", error);
      }
    );

    // Listener para usuários
    usersUnsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const totalUsers = snapshot.size;
        const activeUsers = snapshot.docs.filter(
          doc => doc.data().status === "active"
        ).length;
        
        setStats(prev => ({ 
          ...prev, 
          totalUsers, 
          activeUsers,
          loading: false 
        }));
      },
      (error) => {
        console.error("Error fetching users stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    );

    return () => {
      if (questionsUnsubscribe) questionsUnsubscribe();
      if (usersUnsubscribe) usersUnsubscribe();
    };
  }, []);

  return stats;
};
