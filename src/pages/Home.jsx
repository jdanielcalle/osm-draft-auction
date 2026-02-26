import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const adminSnap = await getDoc(doc(db, "admin", u.uid));
      if (adminSnap.exists()) {
        setUserName("Administrador");
        setRole("admin");
        return;
      }

      const presidentSnap = await getDoc(doc(db, "presidents", u.uid));
      if (presidentSnap.exists()) {
        setUserName(presidentSnap.data().name);
        setRole("president");
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1120] text-white relative overflow-hidden flex flex-col items-center justify-center">

      {/* Glow background */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600 opacity-20 blur-[160px] rounded-full top-[-200px] left-[-200px]" />
      <div className="absolute w-[500px] h-[500px] bg-green-500 opacity-20 blur-[140px] rounded-full bottom-[-200px] right-[-200px]" />

      {/* Usuario conectado */}
      {userName && (
        <div className="absolute top-6 right-10 text-sm text-green-400">
          Conectado como: {userName}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10"
      >
        <h1 className="text-6xl font-extrabold tracking-widest mb-4">
          OSM DRAFT 2026
        </h1>

        <p className="text-xl text-gray-300 mb-12">
          Online Soccer Manager
        </p>

        <div className="flex gap-6 justify-center flex-wrap">

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/live")}
            className="bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-blue-600/40 transition"
          >
            Ir a la Subasta
          </motion.button>

          {userName ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                navigate(role === "admin" ? "/admin" : "/president")
              }
              className="bg-green-600 hover:bg-green-700 px-10 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-green-600/40 transition"
            >
              Ir a mi Panel
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              className="bg-green-600 hover:bg-green-700 px-10 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-green-600/40 transition"
            >
              Soy Presidente
            </motion.button>
          )}

        </div>

      </motion.div>

      <div className="absolute bottom-6 text-sm flex items-center gap-2 text-gray-400">

        <span>Desarrollado por</span>

        <a
            href="https://www.linkedin.com/in/jdanielcalle/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white-400 hover:text-green-300 transition font-semibold"
        >
            Daniel Calle
        </a>

        <span>y</span>

        <a
            href="https://es.onlinesoccermanager.com/Users/588898997/Profile"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white-400 hover:text-green-300 transition font-semibold"
        >
            Agustín Caceres
        </a>

      </div>

    </div>
  );
}