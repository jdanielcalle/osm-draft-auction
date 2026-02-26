import { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";

const PLAYERS_PER_PAGE = 10;

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [auction, setAuction] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [presidents, setPresidents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔴 NUEVO: cerrar sesión
  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubPlayers = onSnapshot(
      collection(db, "players"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPlayers(data);
      }
    );

    const unsubAuction = onSnapshot(
      doc(db, "auction", "current"),
      (docSnap) => {
        setAuction(docSnap.data());
      }
    );

    const unsubPresidents = onSnapshot(
        collection(db, "presidents"),
        (snapshot) => {
            setPresidents(
            snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
        );
      }
    );

    return () => {
      unsubPlayers();
      unsubAuction();
      unsubPresidents();
    };
  }, []);

  useEffect(() => {
    if (!auction?.activePlayerId) return;

    const interval = setInterval(async () => {
      const playerRef = doc(db, "players", auction.activePlayerId);
      const playerSnap = await getDoc(playerRef);
      const playerData = playerSnap.data();

      if (!playerData) return;

      const timeLeft =
        playerData.auctionEndTime - Date.now();

      if (timeLeft <= 0 && auction.status === "active") {
        clearInterval(interval);

        if (!playerData.currentLeader) {
          await updateDoc(playerRef, {
            status: "available",
            auctionEndTime: 0,
          });

          await updateDoc(doc(db, "auction", "current"), {
            activePlayerId: "",
            status: "idle",
          });

          return;
        }

        const winnerRef = doc(
          db,
          "presidents",
          playerData.currentLeader
        );
        const winnerSnap = await getDoc(winnerRef);
        const winnerData = winnerSnap.data();

        await updateDoc(winnerRef, {
          budget:
            winnerData.budget - playerData.currentBid,
          playersCount:
            winnerData.playersCount + 1,
        });

        await updateDoc(playerRef, {
          status: "sold",
        });

        await updateDoc(doc(db, "auction", "current"), {
          activePlayerId: "",
          status: "idle",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const filteredPlayers = useMemo(() => {
    return players
        .filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
        if (a.status === "sold" && b.status !== "sold") return 1;
        if (a.status !== "sold" && b.status === "sold") return -1;
        return 0;
        });
    }, [players, search]);

  const totalPages = Math.ceil(
    filteredPlayers.length / PLAYERS_PER_PAGE
  );

  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * PLAYERS_PER_PAGE,
    currentPage * PLAYERS_PER_PAGE
  );

  const activePlayer = players.find(
    (p) => p.id === auction?.activePlayerId
  );

  const leader = presidents.find(
    (p) => p.id === activePlayer?.currentLeader
  );

  const timeLeft = activePlayer
    ? Math.max(
      0,
      Math.floor(
        (activePlayer.auctionEndTime - Date.now()) / 1000
      )
     )
    : 0;

  const activatePlayer = async (playerId) => {
    await updateDoc(doc(db, "auction", "current"), {
      activePlayerId: playerId,
      status: "active",
    });

    await updateDoc(doc(db, "players", playerId), {
      auctionEndTime: Date.now() + 90000,
      currentBid: 0,
      currentLeader: "",
      status: "available",
    });
  };

  const closeAuction = async () => {
    if (!auction?.activePlayerId) return;

    // 🔴 BLOQUEO SI YA NO ESTÁ ACTIVA
    if (auction.status !== "active") {
        console.log("Subasta ya cerrada");
        return;
    }

    const playerRef = doc(db, "players", auction.activePlayerId);
    const playerSnap = await getDoc(playerRef);
    const playerData = playerSnap.data();

    // 🔴 BLOQUEO SI YA FUE VENDIDO
    if (playerData.status === "sold") {
        console.log("Jugador ya vendido");
        return;
    }

    // 🔴 CERRAR SUBASTA INMEDIATAMENTE
    await updateDoc(doc(db, "auction", "current"), {
        status: "idle",
    });

    if (!playerData.currentLeader) {
        await updateDoc(playerRef, {
        status: "available",
        auctionEndTime: 0,
        });

        await updateDoc(doc(db, "auction", "current"), {
        activePlayerId: "",
        });

        return;
    }

    const winnerRef = doc(
        db,
        "presidents",
        playerData.currentLeader
    );

    const winnerSnap = await getDoc(winnerRef);
    const winnerData = winnerSnap.data();

    await updateDoc(winnerRef, {
        budget: winnerData.budget - playerData.currentBid,
        playersCount: winnerData.playersCount + 1,
        players: [...(winnerData.players || []), playerData.name],
    });

    await updateDoc(playerRef, {
        status: "sold",
        finalPrice: playerData.currentBid, // 🔥 importante
    });

    await updateDoc(doc(db, "auction", "current"), {
        activePlayerId: "",
    });
    };

  const createPlayer = async () => {
    if (!newPlayerName.trim()) return;

    const playerId = newPlayerName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    const existing = await getDoc(doc(db, "players", playerId));
    if (existing.exists()) {
      alert("Ese jugador ya existe");
      return;
    }

    await setDoc(doc(db, "players", playerId), {
      name: newPlayerName,
      currentBid: 0,
      currentLeader: "",
      auctionEndTime: 0,
      status: "available",
    });

    setNewPlayerName("");
  };

  const deletePlayer = async () => {
    if (!deleteTarget) return;

    const playerRef = doc(db, "players", deleteTarget);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists()) {
      setDeleteTarget(null);
      return;
    }

    const playerData = playerSnap.data();

    if (playerData.status === "sold") {
      alert("No puedes eliminar un jugador que ya fue subastado.");
      setDeleteTarget(null);
      return;
    }

    await deleteDoc(playerRef);
    setDeleteTarget(null);
  };

  const saveEdit = async (playerId) => {
    if (!editedName.trim()) return;

    await updateDoc(doc(db, "players", playerId), {
      name: editedName,
    });

    setEditingPlayer(null);
    setEditedName("");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-10">

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Administrador</h1>

        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold transition"
        >
          Cerrar sesión
        </button>
      </div>

      {presidents.length > 0 && (
        <div className="mt-12 mb-12 flex flex-col items-center">

            {/* Flechas */}
            {presidents.length > 3 && (
            <div className="flex items-center gap-6 mb-6">
                <button
                onClick={() =>
                    setCurrentIndex((prev) =>
                    prev === 0 ? presidents.length - 1 : prev - 1
                    )
                }
                className="text-2xl"
                >
                ◀
                </button>

                <button
                onClick={() =>
                    setCurrentIndex((prev) =>
                    prev === presidents.length - 1 ? 0 : prev + 1
                    )
                }
                className="text-2xl"
                >
                ▶
                </button>
            </div>
            )}

            {/* CONTENEDOR LIMITADO */}
            <div className="flex gap-6 justify-center max-w-4xl overflow-hidden">

            {presidents
                .slice(currentIndex, currentIndex + 3)
                .concat(
                currentIndex + 3 > presidents.length
                    ? presidents.slice(0, (currentIndex + 3) % presidents.length)
                    : []
                )
                .map((president, i) => {

                const isCenter = i === 1;

                return (
                    <div
                    key={president.id}
                    className={`transition-all duration-300 rounded-2xl p-6 ${
                        isCenter
                        ? "bg-gray-800 scale-105 w-72"
                        : "bg-gray-800 opacity-60 w-60"
                    }`}
                    >
                    <h3 className="text-xl font-bold text-center mb-2">
                        {president.name}
                    </h3>

                    <p className="text-green-400 text-center mb-4">
                        {president.budget}M
                    </p>

                    {players
                        .filter(
                        (pl) =>
                            pl.status === "sold" &&
                            pl.currentLeader === president.id
                        )
                        .map((pl) => (
                        <div
                            key={pl.id}
                            className="bg-gray-700 p-2 rounded mb-2 text-sm text-center"
                        >
                            {pl.name}
                            <div className="text-yellow-400">
                            {pl.finalPrice || pl.currentBid}M
                            </div>
                        </div>
                        ))}
                    </div>
                );
                })}

            </div>
        </div>
        )}

      {/* Crear jugador */}
      <div className="mb-6 flex justify-between items-center">

    <div className="flex gap-4">
        <input
        value={newPlayerName}
        onChange={(e) => setNewPlayerName(e.target.value)}
        placeholder="Nombre del jugador"
        className="p-3 rounded bg-gray-800 text-white w-64"
        />
        <button
        onClick={createPlayer}
        className="bg-green-600 px-6 py-3 rounded hover:bg-green-700"
        >
        Agregar
        </button>
    </div>

    <input
        placeholder="Buscar jugador..."
        value={search}
        onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
        }}
        className="p-3 rounded bg-gray-800 text-white w-64"
    />

    </div>

      {/* Subasta activa */}
      {auction?.activePlayerId && (
        <button
            disabled={auction.status !== "active"}
            onClick={closeAuction}
            className={`px-6 py-3 rounded mb-6 transition ${
            auction.status !== "active"
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
        >
            {auction.status !== "active"
            ? "Subasta Cerrada"
            : "Cerrar Subasta"}
        </button>
        )}

      {activePlayer && (
        <div className="bg-gray-800 p-6 rounded-2xl mb-6 text-center">

            <h2 className="text-2xl font-bold mb-2">
            {activePlayer.name}
            </h2>

            <p className="text-green-400 text-2xl">
            {activePlayer.currentBid}M
            </p>

            <p className="text-yellow-400">
            Líder: {leader?.name || "Nadie"}
            </p>

            <p className="text-red-400">
            ⏱ {timeLeft}s
            </p>

        </div>
        )}

      {/* Lista */}
      {paginatedPlayers.map((player) => (
        <div
          key={player.id}
          className="bg-gray-800 p-4 mb-3 rounded flex justify-between items-center"
        >
          <div>
            {editingPlayer === player.id ? (
              <>
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-gray-700 p-2 rounded mr-2"
                />
                <button
                  onClick={() => saveEdit(player.id)}
                  className="bg-green-500 px-3 py-1 rounded mr-2"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingPlayer(null)}
                  className="bg-gray-500 px-3 py-1 rounded"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold">
                  {player.name}
                </span>{" "}
                <span className="text-gray-400">
                  — {player.status}
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {player.status !== "sold" && (
              <button
                onClick={() => activatePlayer(player.id)}
                className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                Subastar
              </button>
            )}

            <button
              onClick={() => {
                setEditingPlayer(player.id);
                setEditedName(player.name);
              }}
              className="bg-yellow-500 px-3 py-1 rounded"
            >
              Editar
            </button>

            <button
              onClick={() => setDeleteTarget(player.id)}
              className="bg-red-600 px-3 py-1 rounded"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      {/* Paginador */}
      <div className="flex gap-2 mt-6">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 rounded ${
              currentPage === page
                ? "bg-blue-600"
                : "bg-gray-700"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Modal eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded text-center">
            <p className="mb-6">
              ¿Estás seguro de eliminar este jugador?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={deletePlayer}
                className="bg-red-600 px-6 py-2 rounded"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="bg-gray-600 px-6 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}