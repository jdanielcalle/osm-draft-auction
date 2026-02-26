import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FiLogIn } from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginWithEmail = async () => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Credenciales incorrectas");
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar sesión con Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] relative overflow-hidden text-white">

      {/* Glow decorativo */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600 opacity-20 blur-[120px] rounded-full top-[-150px] left-[-150px]" />
      <div className="absolute w-[400px] h-[400px] bg-green-500 opacity-20 blur-[120px] rounded-full bottom-[-150px] right-[-150px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        whileHover={{ scale: 1.03 }}
        className="relative bg-[#111827] border border-[#1F2937] shadow-2xl rounded-2xl p-10 w-[380px] backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-widest">
            OSM
          </h1>
          <h2 className="text-lg text-green-400 tracking-widest">
            DRAFT 2026
          </h2>
        </div>

        {/* Email */}
        <div className="mb-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#0B1120] border border-[#1F2937] text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#0B1120] border border-[#1F2937] text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
          />
        </div>

        {/* Botón Email */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loginWithEmail}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 mb-4"
        >
          <FiLogIn size={18} />
          Continuar
        </motion.button>

        {error && (
            <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-yellow-400 text-sm text-center font-semibold"
            >
                ⚠ {error}
            </motion.div>
        )}

        <div className="text-center text-gray-500 mb-4">o</div>

        {/* Botón Google */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loginWithGoogle}
          className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
        >
          <FcGoogle size={20} />
          Iniciar con Google
        </motion.button>

        <p className="text-center text-gray-400 text-sm mt-6">
          Online Soccer Manager
        </p>
      </motion.div>
    </div>
  );
}