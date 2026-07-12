import { useState, useCallback } from 'react';
import { ElevatorScene } from './components/ElevatorScene';
import { CustomizePanel } from './components/CustomizePanel';
import { useElevator } from './hooks/useElevator';
import { loadConfig, saveConfig } from './lib/elevatorConfig';
import type { ElevatorConfig } from './lib/elevatorConfig';

export function App() {
  const [config, setConfig] = useState<ElevatorConfig>(loadConfig);
  const [showCustomize, setShowCustomize] = useState(false);

  const handleConfigChange = useCallback((newConfig: ElevatorConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  const elevator = useElevator({ language: config.language });

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-slate-800">AXIEZ-LINKs</h1>
            <p className="text-xs text-slate-500 mt-1">
              エレベーターシミュレーター (3D)
            </p>
          </div>

          {/* 3D scene */}
          <div className="relative w-full h-[65vh] min-h-[440px] rounded-2xl overflow-hidden border border-gray-200 bg-zinc-900 mb-2">
            <ElevatorScene
              theme={config.theme}
              buttonStyle={config.buttonStyle}
              buttonColor={config.buttonColor}
              copFinish={config.copFinish}
              currentFloor={elevator.currentFloor}
              direction={elevator.direction}
              doorState={elevator.doorState}
              isMoving={elevator.isMoving}
              activeButtons={elevator.activeButtons}
              onPressFloor={elevator.pressFloorButton}
              onPressDoorOpen={elevator.pressDoorOpen}
              onPressDoorClose={elevator.pressDoorClose}
              onPressAlarm={elevator.pressAlarm}
            />
          </div>

          <p className="text-center text-xs text-slate-400 mb-6">
            ドラッグで見回し / スクロールでズーム / 操作盤のボタンで階を選択
          </p>

          {/* Customize panel */}
          <CustomizePanel
            config={config}
            isOpen={showCustomize}
            onToggle={() => setShowCustomize((v) => !v)}
            onChange={handleConfigChange}
          />
        </div>
      </main>
    </div>
  );
}
