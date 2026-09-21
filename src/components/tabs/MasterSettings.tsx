import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { SystemConfig } from '@/types';
import { reportStructure } from '@/lib/constants';

export default function MasterSettings() {
  const { currentUser } = useAuth();
  const { systemConfig, updateSystemConfig, resetSystemConfigToDefault } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'menus' | 'salary' | 'incentive' | 'fees' | 'reports'>('menus');
  const [selectedDept, setSelectedDept] = useState<'누수팀' | '재물팀' | '재물심사'>('누수팀');

  // Local draft state
  const [draftConfig, setDraftConfig] = useState<SystemConfig>(systemConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New fee item modal state
  const [newItemName, setNewItemName] = useState('');
  const [newItemFee, setNewItemFee] = useState(50000);

  useEffect(() => {
    setDraftConfig(systemConfig);
  }, [systemConfig]);

  const handleMenuToggle = async (menuKey: string, currentValue: boolean) => {
    try {
      setIsSaving(true);
      const updatedMenuVisibility = {
        ...draftConfig.menuVisibility,
        [menuKey]: !currentValue
      };
      await updateSystemConfig({
        menuVisibility: updatedMenuVisibility
      });
      setDraftConfig(prev => ({
        ...prev,
        menuVisibility: updatedMenuVisibility
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("메뉴 설정 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalaryChange = (dept: string, rank: string, field: 'base' | 'threshold', value: number) => {
    setDraftConfig(prev => ({
      ...prev,
      salaryData: {
        ...prev.salaryData,
        [dept]: {
          ...prev.salaryData[dept],
          [rank]: {
            ...prev.salaryData[dept]?.[rank],
            [field]: value,
            ...(field === 'threshold' ? { target: value } : {})
          }
        }
      }
    }));
  };

  const handleIncentiveRateChange = (rank: string, percent: number) => {
    setDraftConfig(prev => ({
      ...prev,
      incentiveRates: {
        ...prev.incentiveRates,
        [rank]: percent / 100
      }
    }));
  };

  const handleBonusThresholdChange = (dept: string, value: number) => {
    setDraftConfig(prev => ({
      ...prev,
      bonusThresholds: {
        ...prev.bonusThresholds,
        [dept]: value
      }
    }));
  };

  const handleFeeChange = (item: string, fee: number) => {
    setDraftConfig(prev => ({
      ...prev,
      feeMap: {
        ...prev.feeMap,
        [item]: fee
      }
    }));
  };

  const handleAddFeeItem = () => {
    if (!newItemName.trim()) return alert("항목명을 입력하세요.");
    setDraftConfig(prev => ({
      ...prev,
      feeMap: {
        ...prev.feeMap,
        [newItemName.trim()]: newItemFee
      }
    }));
    setNewItemName('');
    alert(`'${newItemName.trim()}' 항목이 추가되었습니다. 하단의 '설정 저장하기'를 눌러 저장하세요.`);
  };

  const loadApril2026Policy = () => {
    const rankNames = ['사원', '주임', '대리', '과장'];
    const makeSalary = (bases: number[], thresholds: number[]) => Object.fromEntries(
      rankNames.map((rank, i) => [rank, {
        base: bases[i], threshold: thresholds[i], target: thresholds[i], type: 'new_tiered'
      }])
    );
    const propertySalary = makeSalary([2300000, 2400000, 2600000, 2800000], [5100000, 5400000, 5700000, 6000000]);
    setDraftConfig(prev => ({
      ...prev,
      salaryData: {
        ...prev.salaryData,
        '누수팀': makeSalary([2500000, 2750000, 3000000, 3250000], [5400000, 5700000, 6000000, 6500000]),
        '재물팀': propertySalary,
        '재물심사': propertySalary
      },
      incentiveRates: { '사원': 0.41, '주임': 0.42, '대리': 0.43, '과장': 0.44 },
      bonusRate: 0.02,
      bonusThresholds: { ...prev.bonusThresholds, '누수팀': 9500000, '재물팀': 8500000, '재물심사': 8500000, '마이브라운': 8500000 }
    }));
    setSaveSuccess(false);
    alert("2026년 4월 기준을 편집 화면에 불러왔습니다. 금액과 비율을 확인한 뒤 ‘설정 저장하기’를 눌러 적용하세요.");
  };

  const handleSaveAll = async () => {
    const rates = Object.values(draftConfig.incentiveRates);
    if (rates.some(rate => !Number.isFinite(rate) || rate < 0 || rate > 1) ||
        !Number.isFinite(draftConfig.bonusRate) || draftConfig.bonusRate < 0 ||
        rates.some(rate => rate + draftConfig.bonusRate > 1)) {
      alert("인센티브 비율은 0~100%이며, 기본비율과 보너스 가산율의 합은 100% 이하여야 합니다.");
      return;
    }
    try {
      setIsSaving(true);
      await updateSystemConfig(draftConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert("마스터 시스템 설정이 성공적으로 저장 및 적용되었습니다.");
    } catch (e) {
      console.error(e);
      alert("설정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("모든 급여, 인센티브 요율, 수수료, 메뉴 설정을 시스템 초기 기본값으로 초기화하시겠습니까?")) {
      try {
        setIsSaving(true);
        await resetSystemConfigToDefault();
        alert("기본값으로 복원되었습니다.");
      } catch (e) {
        console.error(e);
        alert("초기화 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const ranks = ['사원', '주임', '대리', '과장'];

  return (
    <div className="space-y-6 pb-20">
      {/* Master Top Card */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white p-6 rounded-[24px] shadow-lg border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                👑 최고 마스터 권한
              </span>
              <span className="text-xs text-amber-200/80">실시간 시스템 제어 센터</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              마스터 계정 관리 페이지
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              직원 급여·인센티브 기준, 수수료 단가표 및 비활성화된 숨김 메뉴를 자유롭게 관리할 수 있습니다.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-right">
            <div className="text-xs text-amber-200 font-bold">로그인 마스터 계정</div>
            <div className="text-base font-black">{currentUser?.name} 팀장</div>
            <div className="text-xs text-slate-300">ID: {currentUser?.userId} (통합 관리)</div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('menus')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'menus'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>📱</span> 메뉴 노출 관리
            {draftConfig.menuVisibility.corpCard && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('salary')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'salary'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>💵</span> 직급별 급여 & 인센티브
          </button>
          <button
            onClick={() => setActiveSubTab('incentive')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'incentive'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>📈</span> 인센티브 요율 & 보너스
          </button>
          <button
            onClick={() => setActiveSubTab('fees')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'fees'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>🏷️</span> 종결 수수료 단가표
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'reports'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>📋</span> 부서별 마감보고 항목 확인
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>✅</span> 설정이 클라우드에 성공적으로 저장되었습니다! 모든 직원 화면에 즉시 실시간 반영됩니다.
          </div>
        </div>
      )}

      {/* Tab 1: Menu Visibility */}
      {activeSubTab === 'menus' && (
        <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>📱</span> 메뉴 노출 관리 (숨김 / 되살리기)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                버튼을 누르면 즉시 저장되어 모든 계정에 반영됩니다. 메뉴를 숨겨도 기존 데이터는 삭제되지 않습니다.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {[
              { key: 'corpCard', icon: '💳', label: '법인카드 관리', description: '관리자 및 마스터의 법인카드 관리 메뉴를 표시하거나 숨깁니다.' },
              { key: 'notices', icon: '📢', label: '공지사항', description: '모든 계정의 공지사항 메뉴와 상단 공지 안내를 표시하거나 숨깁니다.' },
              { key: 'leave', icon: '🌴', label: '휴가관리', description: '모든 계정의 휴가관리 메뉴를 표시하거나 숨깁니다. 기존 휴가 기록은 유지됩니다.' },
              { key: 'calendar', icon: '📅', label: '일정달력', description: '모든 계정의 일정달력 메뉴를 표시하거나 숨깁니다. 기존 일정은 유지됩니다.' }
            ].map(menu => {
              const visible = draftConfig.menuVisibility[menu.key] === true;
              return (
                <div key={menu.key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg">
                      {menu.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-base">{menu.label}</span>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${visible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {visible ? '현재: 표시 중' : '현재: 숨김'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">{menu.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={`${menu.label} 메뉴 표시`}
                    aria-checked={visible}
                    disabled={isSaving}
                    onClick={() => handleMenuToggle(menu.key, visible)}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shrink-0 shadow-sm disabled:opacity-50 ${visible
                      ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                  >
                    {visible ? '메뉴 숨기기' : '메뉴 되살리기 (표시)'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Salary & Base Targets */}
      {activeSubTab === 'salary' && (
        <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>💵</span> 부서 및 직급별 급여 / 인센티브 관리
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                기본급 + (월매출 − 인센기준) × 적용 비율로 계산합니다. 인센기준 이하의 인센티브는 0원입니다.
              </p>
            </div>

            {/* Department Picker */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['누수팀', '재물팀', '재물심사'] as const).map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDept === dept
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dept === '재물심사' ? '마이브라운 (재물심사)' : `삼성 (${dept})`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 space-y-2">
            <p>기본 비율은 같은 직급의 모든 부서에 공통 적용됩니다. 수정 후 하단의 ‘설정 저장하기’를 눌러주세요.</p>
            <p>보너스 기준을 <b>초과</b>하면 인센기준 초과분 전체에 기본비율 + 가산율을 적용합니다. 보너스 기준과 가산율은 ‘인센티브 요율 &amp; 보너스’에서 수정합니다.</p>
            <p className="text-xs">현재 이 설정은 직원 급여계산기에 적용됩니다. 관리자 정산은 별도 기준을 사용합니다.</p>
            <button type="button" disabled={isSaving} onClick={loadApril2026Policy} className="px-3 py-2 bg-white border border-blue-200 rounded-lg font-bold text-xs disabled:opacity-50">
              2026년 4월 기준 불러오기 (저장 전 미리보기)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-black">
                  <th className="p-3.5">직급</th>
                  <th className="p-3.5">기본급 (원)</th>
                  <th className="p-3.5">인센기준 (원)</th>
                  <th className="p-3.5">기본 인센티브 비율 (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ranks.map(rank => {
                  const conf = draftConfig.salaryData[selectedDept]?.[rank] || { base: 2300000, target: 6000000, threshold: 5600000, type: "normal" };
                  return (
                    <tr key={rank} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {rank}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={10000}
                            value={conf.base}
                            onChange={e => handleSalaryChange(selectedDept, rank, 'base', Number(e.target.value))}
                            className="w-36 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-bold">
                            ({(conf.base / 10000).toLocaleString()}만원)
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={10000}
                            value={conf.threshold}
                            onChange={e => handleSalaryChange(selectedDept, rank, 'threshold', Number(e.target.value))}
                            className="w-36 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-bold">
                            ({(conf.threshold / 10000).toLocaleString()}만원)
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <input
                          aria-label={`${rank} 기본 인센티브 비율 (%)`}
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={Number(((draftConfig.incentiveRates[rank] ?? 0.41) * 100).toFixed(2))}
                          onChange={e => handleIncentiveRateChange(rank, Number(e.target.value))}
                          className="w-24 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Incentive & Bonus */}
      {activeSubTab === 'incentive' && (
        <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📈</span> 인센티브 요율 및 보너스 가산 체계 관리
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              2026-04-01 개정 인센티브 체계의 직급별 기본 지급율과 보너스 초과 달성 기준액을 수정할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 요율 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
                <span>🎯</span> 직급별 기본 인센티브 지급율 (%)
              </h3>
              <div className="space-y-3">
                {ranks.map(rank => {
                  const ratePercent = Number(((draftConfig.incentiveRates[rank] ?? 0.41) * 100).toFixed(2));
                  return (
                    <div key={rank} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{rank} 지급율</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={100}
                          value={ratePercent}
                          onChange={e => handleIncentiveRateChange(rank, Number(e.target.value))}
                          className="w-20 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 보너스 구간 및 가산율 */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200">
              <h3 className="font-extrabold text-amber-900 text-sm mb-4 flex items-center gap-1.5">
                <span>⭐</span> 초과 달성 보너스 기준 및 가산율
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">보너스 가산율</div>
                    <div className="text-[11px] text-slate-500">기준액 초과 시 기본비율에 가산 (%p)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={20}
                      value={Number((draftConfig.bonusRate * 100).toFixed(2))}
                      onChange={e => setDraftConfig(prev => ({ ...prev, bonusRate: Number(e.target.value) / 100 }))}
                      className="w-20 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center bg-white"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/60">
                  <div className="text-xs font-bold text-slate-800 mb-2">부서별 보너스 적용 기준액</div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">삼성 누수팀</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={100000}
                          value={draftConfig.bonusThresholds['누수팀'] || 9500000}
                          onChange={e => handleBonusThresholdChange('누수팀', Number(e.target.value))}
                          className="w-32 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                        />
                        <span className="text-xs text-slate-500 font-bold">
                          ({((draftConfig.bonusThresholds['누수팀'] || 9500000) / 10000).toLocaleString()}만원)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">삼성 재물팀</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={100000}
                          value={draftConfig.bonusThresholds['재물팀'] || 8500000}
                          onChange={e => handleBonusThresholdChange('재물팀', Number(e.target.value))}
                          className="w-32 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                        />
                        <span className="text-xs text-slate-500 font-bold">
                          ({((draftConfig.bonusThresholds['재물팀'] || 8500000) / 10000).toLocaleString()}만원)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">마이브라운</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={100000}
                          value={draftConfig.bonusThresholds['마이브라운'] || 8500000}
                          onChange={e => handleBonusThresholdChange('마이브라운', Number(e.target.value))}
                          className="w-32 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                        />
                        <span className="text-xs text-slate-500 font-bold">
                          ({((draftConfig.bonusThresholds['마이브라운'] || 8500000) / 10000).toLocaleString()}만원)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Fee Map */}
      {activeSubTab === 'fees' && (
        <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>🏷️</span> 종결 수수료 단가표 관리
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                각 마감보고 항목의 1건 종결 시 지급되는 수수료 단가를 설정합니다.
              </p>
            </div>

            {/* Add Fee Item Inline */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="새 항목명 (예: 화재사고)"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="number"
                step={5000}
                placeholder="수수료"
                value={newItemFee}
                onChange={e => setNewItemFee(Number(e.target.value))}
                className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <button
                onClick={handleAddFeeItem}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                + 항목 추가
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(draftConfig.feeMap).map(([item, fee]) => (
              <div key={item} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-800 text-sm">{item}</div>
                  <div className="text-[11px] text-slate-500">1건 종결당 수수료</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step={5000}
                    value={fee}
                    onChange={e => handleFeeChange(item, Number(e.target.value))}
                    className="w-28 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">원</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Reports Structure View */}
      {activeSubTab === 'reports' && (
        <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📋</span> 부서별 일일 마감보고 항목 확인
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              각 부서 소속 직원이 마감보고 작성 시 보고하게 되는 항목과 종결 단가를 한눈에 파악합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 삼성 누수팀 */}
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-blue-900 text-sm flex items-center gap-1.5">
                  <span>🏢</span> 삼성 - 누수팀
                </h3>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  총 {reportStructure['삼성']['누수팀'].length + 1}개 항목
                </span>
              </div>
              <ul className="space-y-2">
                {reportStructure['삼성']['누수팀'].map(item => (
                  <li key={item} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="font-bold text-slate-800">{item}</span>
                    <span className="font-mono font-bold text-blue-600">
                      {(draftConfig.feeMap[item] || 0).toLocaleString()}원
                    </span>
                  </li>
                ))}
                <li className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400">
                  <span>조사미결 (공통)</span>
                  <span>건수 관리</span>
                </li>
              </ul>
            </div>

            {/* 삼성 재물팀 (통합) */}
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-emerald-900 text-sm flex items-center gap-1.5">
                  <span>🏢</span> 삼성 - 재물팀 (통합)
                </h3>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  총 {reportStructure['삼성']['재물팀'].length + 1}개 항목
                </span>
              </div>
              <ul className="space-y-2">
                {reportStructure['삼성']['재물팀'].map(item => (
                  <li key={item} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      {item === '대인사고' && <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded font-black">신규</span>}
                      {item}
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {(draftConfig.feeMap[item] || 0).toLocaleString()}원
                    </span>
                  </li>
                ))}
                <li className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400">
                  <span>조사미결 (공통)</span>
                  <span>건수 관리</span>
                </li>
              </ul>
            </div>

            {/* 마이브라운 */}
            <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-purple-900 text-sm flex items-center gap-1.5">
                  <span>🏢</span> 마이브라운 - 재물심사
                </h3>
                <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  총 {reportStructure['마이브라운']['재물심사'].length + 1}개 항목
                </span>
              </div>
              <ul className="space-y-2">
                {reportStructure['마이브라운']['재물심사'].map(item => (
                  <li key={item} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="font-bold text-slate-800">{item}</span>
                    <span className="font-mono font-bold text-purple-600">
                      {(draftConfig.feeMap[item] || 0).toLocaleString()}원
                    </span>
                  </li>
                ))}
                <li className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400">
                  <span>조사미결 (공통)</span>
                  <span>건수 관리</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30">
        <div className="text-xs text-slate-300">
          <span className="font-bold text-amber-300">💡 마스터 저장 안내:</span> 변경한 급여, 인센티브 및 단가는 실시간으로 급여계산기 및 실적 통계에 동기화됩니다.
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="bg-white/10 hover:bg-white/20 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            초기값 복원
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-400/20 transition-all flex items-center gap-1.5"
          >
            {isSaving ? '저장 중...' : '💾 설정 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
