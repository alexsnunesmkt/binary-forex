import React from "react";
import { AlertNotification, Timeframe } from "../types";
import { Bell, BellRing, BellOff, X, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

interface AlertDrawerProps {
  notifications: AlertNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

export const AlertDrawer: React.FC<AlertDrawerProps> = ({
  notifications,
  onDismiss,
  onClearAll,
  soundEnabled,
  setSoundEnabled,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-amber-400 animate-swing" />
          ) : (
            <Bell className="w-4 h-4 text-slate-400" />
          )}
          Central de Alertas ({notifications.length})
        </h3>
        
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-slate-500 hover:text-slate-300 font-mono font-bold cursor-pointer underline underline-offset-2"
          >
            Limpar Todos
          </button>
        )}
      </div>

      <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 text-xs text-left">
        <div className="text-slate-400">
          Como funciona: Sinais cruzam indicadores das bandas de Bollinger e RSI, emitindo alertas sonoros.
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
          Nenhum alerta recente emitido.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1">
          {notifications.map((notif) => {
            const isCall = notif.type === "CALL";
            const date = new Date(notif.time);
            const timeString = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

            return (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 relative transition-all duration-300 ${
                  isCall
                    ? "bg-emerald-950/10 border-emerald-500/10 hover:border-emerald-500/20"
                    : "bg-rose-950/10 border-rose-500/10 hover:border-rose-500/20"
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className={`p-1.5 rounded-lg ${isCall ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                    {isCall ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-slate-200 text-xs">{notif.pair}</span>
                      <span className="text-[9px] font-bold text-slate-500">{notif.timeframe}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      Confirmar {isCall ? "COMPRA" : "VENDA"} p/ expiração rápida. Preço: <strong className="font-mono text-slate-200">{notif.price}</strong>
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      {timeString}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(notif.id)}
                  className="text-slate-550 hover:text-slate-350 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
