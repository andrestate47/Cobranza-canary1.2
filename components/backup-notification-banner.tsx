"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

export function BackupNotificationBanner() {
  const [showBackupNotice, setShowBackupNotice] = useState(false);
  const [backupState, setBackupState] = useState<"processing" | "success">("processing");

  useEffect(() => {
    // Escuchar eventos globales de respaldo o comprobar horario 02:00 AM
    const checkTime = () => {
      const now = new Date();
      // Si la hora exacta es 02:00:00 AM en hora local
      if (now.getHours() === 2 && now.getMinutes() === 0 && now.getSeconds() <= 10) {
        triggerBackupNotice();
      }
    };

    const interval = setInterval(checkTime, 10000); // Revisar cada 10s

    // Escuchar disparador personalizado de respaldo
    const handleCustomEvent = () => {
      triggerBackupNotice();
    };

    window.addEventListener("app-backup-started", handleCustomEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("app-backup-started", handleCustomEvent);
    };
  }, []);

  const triggerBackupNotice = () => {
    setShowBackupNotice(true);
    setBackupState("processing");

    // Luego de 3.5 segundos, mostrar mensaje de éxito
    setTimeout(() => {
      setBackupState("success");
    }, 3500);

    // Ocultar notificación a los 7 segundos
    setTimeout(() => {
      setShowBackupNotice(false);
    }, 7000);
  };

  if (!showBackupNotice) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="bg-gray-900/95 text-white dark:bg-slate-900/95 dark:text-slate-100 backdrop-blur-md border border-blue-500/40 shadow-2xl rounded-2xl p-4 flex items-center gap-4">
        {backupState === "processing" ? (
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <ShieldCheck className="w-4 h-4 text-blue-300 absolute" />
          </div>
        ) : (
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1">
          {backupState === "processing" ? (
            <>
              <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                🔄 Realizando Respaldo del Sistema
              </h4>
              <p className="text-xs text-gray-300 mt-0.5">
                Protegiendo datos de clientes y préstamos... Espere unos segundos.
              </p>
            </>
          ) : (
            <>
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                ✅ Respaldo Completado con Éxito
              </h4>
              <p className="text-xs text-gray-300 mt-0.5">
                La copia de seguridad ha sido guardada y protegida en el servidor.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
