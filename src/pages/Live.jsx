import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Live() {
  const [players, setPlayers] = useState([]);
  const [presidents, setPresidents] = useState([]);
  const [auction, setAuction] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    });

    const unsubPresidents = onSnapshot(collection(db, "presidents"), (snapshot) => {
      setPresidents(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    });

    const unsubAuction = onSnapshot(doc(db, "auction", "current"), (docSnap) => {
      setAuction(docSnap.data());
    });

    return () => {
      unsubPlayers();
      unsubPresidents();
      unsubAuction();
    };
  }, []);

  const activePlayer = players.find(
    (p) => p.id === auction?.activePlayerId
  );

  const leader = presidents.find(
    (p) => p.id === activePlayer?.currentLeader
  );

  useEffect(() => {
    if (!activePlayer?.auctionEndTime) return;

    const interval = setInterval(() => {
      const remaining =
        Math.floor((activePlayer.auctionEndTime - Date.now()) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePlayer]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10 text-white">

      <div className="bg-gray-900 rounded-2xl shadow-2xl p-10 w-full max-w-6xl">

        <h1 className="text-4xl font-bold text-center mb-8">
          SUBASTA EN VIVO
        </h1>

        {activePlayer && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">
              {activePlayer.name}
            </h2>

            <p className="text-3xl text-green-400">
              {activePlayer.currentBid}M
            </p>

            <p className="text-yellow-400 text-xl">
              Líder: {leader?.name || "Nadie"}
            </p>

            <p className="text-red-400 text-xl">
              ⏱ {timeLeft}s
            </p>
          </div>
        )}

        {/* TABLA EQUIPOS */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${presidents.length}, minmax(220px, 1fr))`
            }}
          >
            {presidents.map((p) => {

              // Obtener jugadores vendidos de este presidente
              const soldPlayers = players.filter(
                (pl) =>
                  pl.status === "sold" &&
                  pl.currentLeader === p.id
              );

              return (
                <div
                  key={p.id}
                  className="bg-gray-800 rounded-xl p-4"
                >
                  <h3 className="text-center font-bold text-lg">
                    {p.name}
                  </h3>

                  <p className="text-center text-sm text-green-400 mb-4">
                    Presupuesto Restante: {p.budget}M
                  </p>

                  {soldPlayers.length > 0 ? (
                    soldPlayers.map((pl) => (
                      <div
                        key={pl.id}
                        className="bg-gray-700 p-3 mb-3 rounded text-center"
                      >
                        <div className="font-semibold">
                          {pl.name}
                        </div>

                        <div className="text-sm text-yellow-400">
                          Precio Final: {pl.finalPrice || pl.currentBid}M
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">
                      —
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}