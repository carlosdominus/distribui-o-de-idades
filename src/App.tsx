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
  Loader2
} from 'lucide-react';
import Papa from 'papaparse';
import { motion } from 'motion/react';

// Google Sheet CSV Export URL
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1v-xiB_Xne8aHDOIKRAbSCrYtOFMbLpPQ/export?format=csv';

interface AgeData {
  age: number;
  count: number;
}

interface Stats {
  total: number;
  average: number;
  min: number;
  max: number;
}

export default function App() {
  const [data, setData] = useState<AgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, average: 0, min: 0, max: 0 });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error('Falha ao buscar dados da planilha.');
      
      const csvText = await response.text();
      
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
            setError('Nenhuma idade válida encontrada na planilha.');
            setLoading(false);
            return;
          }

          // Count occurrences
          const ageCounts: Record<number, number> = {};
          rawAges.forEach((age) => {
            ageCounts[age] = (ageCounts[age] || 0) + 1;
          });

          // Convert to array and sort by age
          const chartData: AgeData[] = Object.entries(ageCounts)
            .map(([age, count]) => ({
              age: parseInt(age),
              count: count as number,
            }))
            .sort((a, b) => a.age - b.age);

          // Calculate stats
          const total = rawAges.length;
          const sum = rawAges.reduce((a, b) => a + b, 0);
          const average = sum / total;
          const min = Math.min(...rawAges);
          const max = Math.max(...rawAges);

          setData(chartData);
          setStats({ total, average, min, max });
          setLoading(false);
        },
        error: () => {
          setError('Erro ao processar os dados da planilha.');
          setLoading(false);
        }
      });
    } catch (err) {
      setError('Erro ao carregar a planilha. Verifique se o link está correto e público.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-wider text-xs uppercase mb-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              Live Analytics
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              Distribuição de <span className="text-indigo-600">Idades</span>
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2">
              Visualização de dados em tempo real da planilha pública
              <a 
                href="https://docs.google.com/spreadsheets/d/1v-xiB_Xne8aHDOIKRAbSCrYtOFMbLpPQ/edit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Google Drive <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar Dados
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="Total de Registros" 
            value={stats.total} 
            icon={<Users className="w-5 h-5" />} 
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            title="Média de Idade" 
            value={stats.average.toFixed(1)} 
            icon={<TrendingUp className="w-5 h-5" />} 
            color="bg-emerald-50 text-emerald-600"
            suffix=" anos"
          />
          <StatCard 
            title="Idade Mínima" 
            value={stats.min} 
            icon={<ArrowDownRight className="w-5 h-5" />} 
            color="bg-amber-50 text-amber-600"
          />
          <StatCard 
            title="Idade Máxima" 
            value={stats.max} 
            icon={<ArrowUpRight className="w-5 h-5" />} 
            color="bg-rose-50 text-rose-600"
          />
        </div>

        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Frequência por Idade</h3>
              <p className="text-slate-500 text-sm">Distribuição quantitativa de cada idade registrada</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
                Quantidade
              </div>
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
                  dataKey="age" 
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
                          <p className="text-xs text-slate-400 mb-1">Idade: <span className="text-white font-bold">{payload[0].payload.age}</span></p>
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
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count > stats.total / data.length ? '#4f46e5' : '#818cf8'} 
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-400 text-sm">
          <p>© 2026 Dashboard de Idades • Desenvolvido com React & Recharts</p>
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
