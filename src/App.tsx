/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Target,
  MapPin,
  LayoutDashboard,
  Phone
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

// Google Sheet CSV Export URLs
const AGE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HMdurn2vcQ_kFcrmWGTD1RaihRtDLGzj/export?format=csv';
const LOCATION_SHEET_1_URL = 'https://docs.google.com/spreadsheets/d/1dI8wlGRKM6pTkD-vBDXIemeRmNFqfFg_/export?format=csv';
const LOCATION_SHEET_2_URL = 'https://docs.google.com/spreadsheets/d/1dFsbierxJJjW6YIGEyPRuSLO9RANe_Pw/export?format=csv';

const DDD_TO_STATE: Record<string, string> = {
  '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
  '21': 'RJ', '22': 'RJ', '24': 'RJ',
  '27': 'ES', '28': 'ES',
  '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
  '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
  '47': 'SC', '48': 'SC', '49': 'SC',
  '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
  '61': 'DF',
  '62': 'GO', '64': 'GO',
  '63': 'TO',
  '65': 'MT', '66': 'MT',
  '67': 'MS',
  '68': 'AC',
  '69': 'RO',
  '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
  '79': 'SE',
  '81': 'PE', '87': 'PE',
  '82': 'AL',
  '83': 'PB',
  '84': 'RN',
  '85': 'CE', '88': 'CE',
  '86': 'PI', '89': 'PI',
  '91': 'PA', '93': 'PA', '94': 'PA',
  '92': 'AM', '97': 'AM',
  '95': 'RR',
  '96': 'AP',
  '98': 'MA', '99': 'MA'
};

const STATE_TO_REGION: Record<string, string> = {
  'SP': 'Sudeste', 'RJ': 'Sudeste', 'MG': 'Sudeste', 'ES': 'Sudeste',
  'PR': 'Sul', 'SC': 'Sul', 'RS': 'Sul',
  'BA': 'Nordeste', 'SE': 'Nordeste', 'PE': 'Nordeste', 'AL': 'Nordeste', 'PB': 'Nordeste', 'RN': 'Nordeste', 'CE': 'Nordeste', 'PI': 'Nordeste', 'MA': 'Nordeste',
  'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste',
  'TO': 'Norte', 'AC': 'Norte', 'RO': 'Norte', 'PA': 'Norte', 'AM': 'Norte', 'RR': 'Norte', 'AP': 'Norte'
};

interface ChartData {
  label: string;
  count: number;
}

interface Stats {
  total: number;
  average?: number;
  min?: number;
  max?: number;
  maxCount: number;
  maxRegionCount: number;
  recommendedRange?: string;
  topLabel?: string;
}

type DashboardTab = 'age' | 'location';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('age');
  const [data, setData] = useState<ChartData[]>([]);
  const [regionData, setRegionData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, maxCount: 0, maxRegionCount: 0 });

  const fetchAgeData = async () => {
    const response = await fetch(AGE_SHEET_URL);
    if (!response.ok) throw new Error('Falha ao buscar dados da planilha de idades.');
    const csvText = await response.text();
    
    return new Promise<void>((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rawAges = results.data
            .flat()
            .map((val: any) => {
              const num = parseInt(String(val).trim());
              return isNaN(num) ? null : num;
            })
            .filter((age): age is number => age !== null);

          if (rawAges.length === 0) {
            reject(new Error('Nenhuma idade válida encontrada na planilha.'));
            return;
          }

          const counts: Record<number, number> = {};
          rawAges.forEach((age) => {
            counts[age] = (counts[age] || 0) + 1;
          });

          const chartData: ChartData[] = Object.entries(counts)
            .map(([age, count]) => ({
              label: age,
              count: count as number,
            }))
            .sort((a, b) => parseInt(a.label) - parseInt(b.label));

          const total = rawAges.length;
          const sum = rawAges.reduce((a, b) => a + b, 0);
          const average = sum / total;
          const min = Math.min(...rawAges);
          const max = Math.max(...rawAges);
          const maxCountInChart = Math.max(...chartData.map(d => d.count));

          const brackets: Record<number, number> = {};
          rawAges.forEach(age => {
            const bracket = Math.floor(age / 10) * 10;
            brackets[bracket] = (brackets[bracket] || 0) + 1;
          });
          
          let bestBracket = 0;
          let maxBracketCount = 0;
          Object.entries(brackets).forEach(([bracket, count]) => {
            if (count > maxBracketCount) {
              maxBracketCount = count;
              bestBracket = parseInt(bracket);
            }
          });

          setData(chartData);
          setStats({ 
            total, 
            average, 
            min, 
            max, 
            maxCount: maxCountInChart, 
            maxRegionCount: 0,
            recommendedRange: `${bestBracket} - ${bestBracket + 9}` 
          });
          resolve();
        },
        error: reject
      });
    });
  };

  const fetchLocationData = async () => {
    const [res1, res2] = await Promise.all([
      fetch(LOCATION_SHEET_1_URL),
      fetch(LOCATION_SHEET_2_URL)
    ]);

    if (!res1.ok || !res2.ok) throw new Error('Falha ao buscar dados das planilhas de localização.');

    const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);

    const states: string[] = [];

    // Parse Sheet 1 (Column AA = index 26)
    Papa.parse(csv1, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          const state = String(row[26] || '').trim().toUpperCase();
          if (state && state.length === 2) {
            states.push(state);
          }
        });
      }
    });

    // Parse Sheet 2 (Column AN = index 39)
    Papa.parse(csv2, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          const phone = String(row[39] || '').replace(/\D/g, '');
          // Format: 5511... or 11...
          let ddd = '';
          if (phone.startsWith('55') && phone.length >= 4) {
            ddd = phone.substring(2, 4);
          } else if (phone.length >= 2) {
            ddd = phone.substring(0, 2);
          }

          if (ddd && DDD_TO_STATE[ddd]) {
            states.push(DDD_TO_STATE[ddd]);
          }
        });
      }
    });

    // Wait a bit for Papa Parse (it's sync here but good to be safe if we were using workers)
    // Actually Papa.parse is sync unless worker: true is passed.
    
    if (states.length === 0) {
      throw new Error('Nenhuma localização válida encontrada nas planilhas.');
    }

    const counts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    
    states.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
      const region = STATE_TO_REGION[s] || 'Outros';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    const chartData: ChartData[] = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const rData: ChartData[] = Object.entries(regionCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const maxCountInChart = Math.max(...chartData.map(d => d.count));
    const maxRegionCount = Math.max(...rData.map(d => d.count));
    const topLabel = chartData[0]?.label || '-';

    setData(chartData);
    setRegionData(rData);
    setStats({ 
      total: states.length, 
      maxCount: maxCountInChart,
      maxRegionCount,
      topLabel
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'age') {
        await fetchAgeData();
      } else {
        await fetchLocationData();
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">Carregando dados da planilha...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-wider text-xs uppercase mb-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              Live Analytics
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              Distribuição de <span className="text-indigo-600">{activeTab === 'age' ? 'Idades' : 'Localização'}</span>
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2">
              Visualização de dados em tempo real das planilhas públicas
              <a 
                href={activeTab === 'age' ? AGE_SHEET_URL.replace('/export?format=csv', '/edit') : LOCATION_SHEET_1_URL.replace('/export?format=csv', '/edit')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Google Drive <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
              <button 
                onClick={() => setActiveTab('age')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'age' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Idades
              </button>
              <button 
                onClick={() => setActiveTab('location')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'location' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <MapPin className="w-4 h-4" />
                Localização
              </button>
            </div>
            
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12"
          >
            <StatCard 
              title="Total de Registros" 
              value={stats.total} 
              icon={<Users className="w-5 h-5" />} 
              color="bg-blue-50 text-blue-600"
            />
            {activeTab === 'age' ? (
              <>
                <StatCard 
                  title="Média de Idade" 
                  value={stats.average?.toFixed(1) || 0} 
                  icon={<TrendingUp className="w-5 h-5" />} 
                  color="bg-emerald-50 text-emerald-600"
                  suffix=" anos"
                />
                <StatCard 
                  title="Idade Mínima" 
                  value={stats.min || 0} 
                  icon={<ArrowDownRight className="w-5 h-5" />} 
                  color="bg-amber-50 text-amber-600"
                />
                <StatCard 
                  title="Idade Máxima" 
                  value={stats.max || 0} 
                  icon={<ArrowUpRight className="w-5 h-5" />} 
                  color="bg-rose-50 text-rose-600"
                />
                <StatCard 
                  title="Foco Tráfego Pago" 
                  value={stats.recommendedRange || '-'} 
                  icon={<Target className="w-5 h-5" />} 
                  color="bg-indigo-50 text-indigo-600"
                  suffix=" anos"
                />
              </>
            ) : (
              <>
                <StatCard 
                  title="Estado Líder" 
                  value={stats.topLabel || '-'} 
                  icon={<MapPin className="w-5 h-5" />} 
                  color="bg-emerald-50 text-emerald-600"
                />
                <StatCard 
                  title="Fontes de Dados" 
                  value="2 Planilhas" 
                  icon={<LayoutDashboard className="w-5 h-5" />} 
                  color="bg-amber-50 text-amber-600"
                />
                <StatCard 
                  title="Mapeamento DDD" 
                  value="Ativo" 
                  icon={<Phone className="w-5 h-5" />} 
                  color="bg-rose-50 text-rose-600"
                />
                <StatCard 
                  title="Região Principal" 
                  value={stats.topLabel === 'SP' || stats.topLabel === 'RJ' || stats.topLabel === 'MG' || stats.topLabel === 'ES' ? 'Sudeste' : 'Brasil'} 
                  icon={<Target className="w-5 h-5" />} 
                  color="bg-indigo-50 text-indigo-600"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Chart Section */}
        <div className="space-y-8">
          <motion.div 
            key={`chart-${activeTab}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === 'age' ? 'Frequência por Idade' : 'Distribuição por Estado (UF)'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {activeTab === 'age' ? 'Distribuição quantitativa de cada idade registrada' : 'Volume de registros por estado brasileiro'}
                </p>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800">
                            <p className="text-xs text-slate-400 mb-1">
                              {activeTab === 'age' ? 'Idade' : 'Estado'}: <span className="text-white font-bold">{payload[0].payload.label}</span>
                            </p>
                            <p className="text-sm font-bold flex items-center gap-2">
                              <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                              {payload[0].value} ocorrências
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[6, 6, 0, 0]}
                    animationDuration={1500}
                  >
                    {data.map((entry, index) => {
                      const ratio = stats.maxCount > 0 ? entry.count / stats.maxCount : 0;
                      const r = Math.round(251 + (239 - 251) * ratio);
                      const g = Math.round(191 + (68 - 191) * ratio);
                      const b = Math.round(36 + (68 - 36) * ratio);
                      const color = `rgb(${r}, ${g}, ${b})`;
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={color} 
                          fillOpacity={0.9}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {activeTab === 'location' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Distribuição por Região</h3>
                  <p className="text-slate-500 text-sm">Volume de registros agrupados por regiões do Brasil</p>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800">
                              <p className="text-xs text-slate-400 mb-1">
                                Região: <span className="text-white font-bold">{payload[0].payload.label}</span>
                              </p>
                              <p className="text-sm font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                                {payload[0].value} ocorrências
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[6, 6, 0, 0]}
                      animationDuration={1500}
                    >
                      {regionData.map((entry, index) => {
                        const ratio = stats.maxRegionCount > 0 ? entry.count / stats.maxRegionCount : 0;
                        const r = Math.round(251 + (239 - 251) * ratio);
                        const g = Math.round(191 + (68 - 191) * ratio);
                        const b = Math.round(36 + (68 - 36) * ratio);
                        const color = `rgb(${r}, ${g}, ${b})`;
                        
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={color} 
                            fillOpacity={0.9}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-400 text-sm">
          <p>© 2026 Dashboard de Analytics • Desenvolvido com React & Recharts</p>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, suffix = "" }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900">
          {value}{suffix}
        </h4>
      </div>
    </div>
  );
}
