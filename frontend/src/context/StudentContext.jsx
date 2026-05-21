import { createContext, useContext, useState } from 'react';

const StudentContext = createContext(null);

const initialData = {
  profile: { name: 'Malek', level: 12, xp: 8400, xpNext: 10000 },
  lifeScore: {
    overall: 83,
    learning: 91,
    health: 74,
    discipline: 82,
    social: 67,
    finance: 88,
  },
  study: {
    todayHours: 3.5,
    weekHours: 18.5,
    streak: 7,
    subjects: [
      { name: 'Mathématiques', hours: 6.5, color: '#4361ee', progress: 72 },
      { name: 'Informatique', hours: 5, color: '#7c3aed', progress: 85 },
      { name: 'Anglais', hours: 3, color: '#10b981', progress: 60 },
      { name: 'Physique', hours: 4, color: '#f59e0b', progress: 45 },
    ],
    weeklyStudy: [
      { day: 'Lun', hours: 4 }, { day: 'Mar', hours: 2.5 }, { day: 'Mer', hours: 3 },
      { day: 'Jeu', hours: 5 }, { day: 'Ven', hours: 1.5 }, { day: 'Sam', hours: 2.5 },
      { day: 'Dim', hours: 0 },
    ],
  },
  fitness: {
    streak: 5,
    weekSessions: 4,
    calories: 1840,
    sleep: 6.5,
    water: 1.8,
    weight: 72,
    weeklyActivity: [
      { day: 'Lun', calories: 320 }, { day: 'Mar', calories: 0 }, { day: 'Mer', calories: 450 },
      { day: 'Jeu', calories: 280 }, { day: 'Ven', calories: 520 }, { day: 'Sam', calories: 200 },
      { day: 'Dim', calories: 70 },
    ],
  },
  goals: [
    { id: 1, title: 'Avoir 16/20 de moyenne', category: 'study', progress: 68, target: 100, unit: '%', color: '#4361ee', deadline: '2026-06-30' },
    { id: 2, title: 'Courir 100 km', category: 'fitness', progress: 47, target: 100, unit: 'km', color: '#10b981', deadline: '2026-12-31' },
    { id: 3, title: 'Économiser 2000€', category: 'finance', progress: 35, target: 100, unit: '%', color: '#f59e0b', deadline: '2026-12-31' },
    { id: 4, title: 'Lire 12 livres', category: 'culture', progress: 4, target: 12, unit: 'livres', color: '#7c3aed', deadline: '2026-12-31' },
    { id: 5, title: 'Apprendre le piano', category: 'skills', progress: 22, target: 100, unit: '%', color: '#ec4899', deadline: '2026-09-30' },
  ],
  mood: { today: 4, energy: 3.5 },
  events: [
    { id: 1, title: 'Examen Maths', time: '08:30', date: 'Demain', type: 'exam', color: '#ef4444' },
    { id: 2, title: 'Séance sport', time: '18:00', date: "Aujourd'hui", type: 'fitness', color: '#10b981' },
    { id: 3, title: 'Rendu rapport', time: '23:59', date: 'Vendredi', type: 'deadline', color: '#f59e0b' },
    { id: 4, title: 'Révision Physique', time: '14:00', date: 'Jeudi', type: 'study', color: '#4361ee' },
  ],
};

export function StudentProvider({ children }) {
  const [data, setData] = useState(initialData);

  function updateMood(value) {
    setData(d => ({ ...d, mood: { ...d.mood, today: value } }));
  }

  function updateEnergy(value) {
    setData(d => ({ ...d, mood: { ...d.mood, energy: value } }));
  }

  return (
    <StudentContext.Provider value={{ data, updateMood, updateEnergy }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}
