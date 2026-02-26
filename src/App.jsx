import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Admin from "./pages/Admin";
import President from "./pages/President";
import Live from "./pages/Live";
import Login from "./pages/Login";
import Home from "./pages/Home";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const uid = u.uid;

        // 🔎 Buscar si es admin por UID
        const adminSnap = await getDoc(doc(db, "admin", uid));
        if (adminSnap.exists()) {
          setUser(u);
          setRole("admin");
          setLoading(false);
          return;
        }

        // 🔎 Buscar si es president por UID
        const presidentSnap = await getDoc(doc(db, "presidents", uid));
        if (presidentSnap.exists()) {
          setUser(u);
          setRole("president");
          setLoading(false);
          return;
        }

        // ❌ No tiene rol
        alert("No tienes permisos para acceder.");
        await auth.signOut();
        setUser(null);
        setRole(null);

      } catch (err) {
        console.error("Error validando rol:", err);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* LANDING */}
        <Route path="/" element={<Home />} />

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            user
              ? role === "admin"
                ? <Navigate to="/admin" />
                : role === "president"
                ? <Navigate to="/president" />
                : <Navigate to="/" />
              : <Login />
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            user && role === "admin"
              ? <Admin />
              : <Navigate to="/login" />
          }
        />

        {/* PRESIDENT */}
        <Route
          path="/president"
          element={
            user && role === "president"
              ? <President />
              : <Navigate to="/login" />
          }
        />

        {/* LIVE */}
        <Route path="/live" element={<Live />} />

        {/* CUALQUIER RUTA DESCONOCIDA */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}