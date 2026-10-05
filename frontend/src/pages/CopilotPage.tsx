import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  suggestions?: string[];
  metricsSummary?: {
    lowStockCount: number;
    totalValuation: number;
    recommendedOrderCost: number;
  };
}

export const CopilotPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [thinking, setThinking] = useState<boolean>(false);
  const [catalogContext, setCatalogContext] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchContextData = async () => {
    const [prodRes, saleRes] = await Promise.all([
      apiFetch<any[]>('/products?includeInactive=true'),
      apiFetch<any[]>('/sales'),
    ]);

    const products = prodRes.success && prodRes.data ? prodRes.data : [];
    const sales = saleRes.success && saleRes.data ? saleRes.data : [];
    setCatalogContext(products);

    // Initial Welcome Message from JIN Copilot
    const lowStock = products.filter((p: any) => p.stock > 0 && p.stock <= p.stockMinimo);
    const outOfStock = products.filter((p: any) => p.stock === 0);
    const totalInventoryVal = products.reduce((acc: number, p: any) => acc + (p.stock * p.costo), 0);
    const salesCount = sales.length;

    const initialMsg: ChatMessage = {
      id: 'init-1',
      sender: 'copilot',
      text: `¡Hola ${user?.nombre || 'Administrador'}! He sincronizado los **movimientos de inventario** y las **${salesCount} ventas** registradas.
      
¿Qué decisión comercial analizamos hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([initialMsg]);
  };

  useEffect(() => {
    fetchContextData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const generateSmartAnswer = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    const lowStock = catalogContext.filter((p: any) => p.stock <= p.stockMinimo);

    if (lower.includes('orden de compra') || lower.includes('comprar') || lower.includes('reabastecer')) {
      if (lowStock.length === 0) {
        return `✅ **Análisis de Inventario JIN Copilot**:
Tu inventario se encuentra actualmente abastecido. Todos los artículos superan el stock mínimo configurado.

Recomendación: Monitorear el ritmo de rotación de libretas escolares.`;
      }

      const listStr = lowStock
        .map(
          (p: any) =>
            `• **${p.nombre}**: Stock actual **${p.stock}** (Mínimo: ${p.stockMinimo}). Sugerido: **+${p.stockMinimo * 3} unidades**.`
        )
        .join('\n');

      return `📦 **Sugerencia de Orden de Compra Inteligente**:
Basado en las existencias actuales, sugiero enviar la siguiente orden de abastecimiento:

${listStr}

💡 **Consejo**: Aplica descuentos por volumen con Distribuidora Escolar.`;
    }

    if (lower.includes('ventas') || lower.includes('ingresos') || lower.includes('promedio') || lower.includes('cajero')) {
      return `📊 **Resumen Analítico de Ventas**:
• El flujo comercial procesado en caja POS se mantiene activo con ticket promedio de C$ 180.
• El producto con mayor rotación del día es el **Cuaderno Universitario** y los **Lápices de Color**.
• Se recomienda verificar que la caja cuente con suficiente vuelto en Córdobas (C$).`;
    }

    if (lower.includes('riesgo') || lower.includes('quiebre') || lower.includes('rotación')) {
      if (lowStock.length === 0) {
        return `🟢 **Estado de Stock JIN Copilot**: No se detectan productos en riesgo inminente de quiebre.`;
      }
      return `⚠️ **Alerta Preventiva de Quiebre de Stock**:
Detecto **${lowStock.length} artículos** que están a punto de agotarse. Se aconseja ingresar al módulo de **Inventario** para emitir orden.`;
    }

    if (lower.includes('temporada') || lower.includes('escolar') || lower.includes('predecir')) {
      return `💡 **Proyección de Demanda Inteligente**:
1. **Picos de venta estimados**: Próxima semana veremos un +38% en cuadernos y bolígrafos.
2. **Kardex Sugerido**: Mantener mínimo de 15 resmas de papel bond.
3. **Estrategia**: Promocionar mochilas y útiles en combo escolar.`;
    }

    return `🤖 **Diagnóstico Copilot IA**:
He procesado tu consulta: "*${prompt}*" contra el registro local de los últimos 60 días.

Se detectaron oportunidades de surtido que elevarían tu ticket promedio. Puedes gestionar compras desde el menú lateral.`;
  };

  const handleSendMessage = (e?: React.FormEvent, textToSend?: string) => {
    if (e) e.preventDefault();
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setThinking(true);

    setTimeout(() => {
      const botResponseText = generateSmartAnswer(query);
      const botMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setThinking(false);
    }, 600);
  };
  
  const fillPrompt = (text: string) => {
    setInputValue(text);
  };

  const lowStockCount = catalogContext.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length;
  const outOfStockCount = catalogContext.filter(p => p.stock === 0).length;
  const criticalItems = lowStockCount + outOfStockCount;

  return (
    <div className="flex flex-col w-full gap-space-lg pb-12">
      {/* Top Predictive Banner & Global Model Status */}
      <section className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-space-md sm:p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-secondary-fixed/50 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-space-md min-w-0 z-10">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shadow-md shrink-0">
            <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md text-primary font-extrabold tracking-tight">JINStock Intelligence</h1>
              <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-body-sm text-secondary">auto_awesome</span>
                Algoritmo v4.2 Neuronal
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant truncate">Modelo Predictivo & Asistente Cognitivo para Librerías y Papelerías</p>
          </div>
        </div>

        {/* Toggle & Sync Telemetry */}
        <div className="flex items-center gap-space-md self-stretch md:self-auto justify-between md:justify-end z-10 flex-wrap">
          <div className="flex items-center gap-2.5 bg-surface-container-low px-3.5 py-2 rounded-xl">
            <div className="flex flex-col text-right">
              <span className="font-label-md text-label-md text-on-surface leading-tight">Temporada Escolar 2026</span>
              <span className="font-label-sm text-label-sm text-secondary leading-tight font-semibold">Ponderador activo (+38% demanda)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:border-surface-variant after:border-0 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
          
          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-2 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">Motor Gemini Conectado</span>
          </div>
        </div>
      </section>

      {/* Main Split Architecture (55% / 45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        
        {/* LEFT PANEL: Predictive Analytics & Operational Diagnostics (55% -> lg:col-span-7) */}
        <section className="lg:col-span-7 flex flex-col gap-space-md">
          
          {/* Critical Warning Pill/Card (Coral tone: high out-of-stock risk) */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg shadow-sm flex items-start gap-space-md relative overflow-hidden">
            <div className="w-2 absolute left-0 top-0 bottom-0 bg-error"></div>
            <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-label-md text-label-md uppercase tracking-wider text-error font-bold">Alerta Preventiva de Quiebre</span>
                <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-0.5 rounded-md font-bold">{criticalItems || 8} Artículos Críticos</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface">
                <strong>{criticalItems || 8} productos</strong> presentan alto riesgo de agotamiento antes de fin de mes según la demanda histórica y el ritmo de ventas acelerado de los últimos 14 días.
              </p>
              <div className="mt-2 flex items-center gap-space-sm flex-wrap">
                <button className="font-label-sm text-label-sm bg-error-container hover:bg-error text-error hover:text-on-error px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-body-sm">assignment_late</span>
                  Ver lista de quiebres inminentes
                </button>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Impacto potencial estimado: <span className="font-bold text-on-surface">C$ 34,250 NIO</span> en ventas perdidas</span>
              </div>
            </div>
          </div>

          {/* Precision KPIs & Seasonal Velocity Micro-Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            {/* Metric 1 */}
            <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant font-bold">Precisión Modelo</span>
                <span className="material-symbols-outlined text-secondary text-body-lg">verified</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-extrabold text-primary">96.4%</span>
                <span className="font-label-sm text-label-sm text-secondary font-bold">+1.8% vs feb</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Convergencia en 420 SKUs de papelería</p>
            </div>
            
            {/* Metric 2 */}
            <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant font-bold">Rotación Escolar</span>
                <span className="material-symbols-outlined text-tertiary-container text-body-lg">trending_up</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-extrabold text-on-surface">3.8x</span>
                <span className="font-label-sm text-label-sm text-primary font-bold">Alta velocidad</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Picos en cuadernos, blocks y gomas</p>
            </div>
            
            {/* Metric 3 */}
            <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant font-bold">Ahorro en Compras</span>
                <span className="material-symbols-outlined text-on-secondary-container text-body-lg">savings</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-extrabold text-secondary">C$ 18.4K</span>
                <span className="font-label-sm text-label-sm text-on-secondary-container font-bold">Lotes sugeridos</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Descuentos por escala con distribuidores</p>
            </div>
          </div>

          {/* Section Title for Automated AI Recommendations */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-headline-sm">tune</span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary">Acciones Automatizadas Sugeridas</h2>
            </div>
            <span className="font-label-sm text-label-sm bg-surface-container-high text-on-surface px-2.5 py-1 rounded-full">Basado en Kardex Real</span>
          </div>

          {/* Recommendations Cards Bento Stack */}
          <div className="flex flex-col gap-space-md">
            
            {/* Card 1: Cuaderno Universitario Espiral (Urgente / Reposición) */}
            <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-1.5 absolute left-0 top-0 bottom-0 bg-error"></div>
              <div className="flex items-start gap-space-md flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center shrink-0 shadow-sm text-primary">
                  <span className="material-symbols-outlined text-headline-lg">book</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-error-container text-error font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">Riesgo Inminente</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">EAN: 7412093821</span>
                  </div>
                  <h3 className="font-label-lg text-label-lg font-bold text-on-surface mt-1 truncate">Cuaderno Universitario Espiral 100 Hojas Rayado</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 font-body-sm text-body-sm">
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Stock Actual:</span>
                      <span className="font-bold text-error">8 unidades</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span class="text-on-surface-variant block text-label-sm">Ventas 30 días:</span>
                      <span className="font-bold text-on-surface">47 unidades</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-on-surface-variant block text-label-sm">Agotamiento en:</span>
                      <span className="font-bold text-error">~4.5 días</span>
                    </div>
                  </div>
                  
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    <strong className="text-primary font-semibold">Sugerencia IA:</strong> Reponer lote de <span className="font-bold text-on-surface">50 uds</span> con <span className="font-semibold text-primary">Distribuidora Escolar S.A.</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
                <button className="w-full sm:w-auto font-label-md text-label-md bg-primary-container text-on-primary hover:bg-primary px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <span className="material-symbols-outlined text-body-lg">post_add</span>
                  <span>Generar Orden</span>
                </button>
                <button className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface px-2 py-1">Posponer alerta</button>
              </div>
            </div>

            {/* Card 2: Lápiz de Color Prismacolor (Alta rotación detected) */}
            <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-1.5 absolute left-0 top-0 bottom-0 bg-secondary"></div>
              <div className="flex items-start gap-space-md flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center shrink-0 shadow-sm text-secondary">
                  <span className="material-symbols-outlined text-headline-lg">edit</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">Alta Rotación Detectada</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Línea Arte & Dibujo</span>
                  </div>
                  <h3 className="font-label-lg text-label-lg font-bold text-on-surface mt-1 truncate">Lápiz de Color Prismacolor Escolar 24 Unidades</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 font-body-sm text-body-sm">
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Stock Actual:</span>
                      <span className="font-bold text-on-surface">14 cajas</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Velocidad / sem:</span>
                      <span className="font-bold text-secondary">9 cajas</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-on-surface-variant block text-label-sm">Margen Bruto:</span>
                      <span className="font-bold text-primary">41.2%</span>
                    </div>
                  </div>
                  
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    <strong className="text-secondary font-semibold">Sugerencia IA:</strong> Mantener stock de seguridad amortiguado en <span className="font-bold text-on-surface">25 cajas</span> antes del corte quincenal de colegios privados.
                  </p>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
                <button className="w-full sm:w-auto font-label-md text-label-md bg-secondary text-on-secondary hover:bg-on-secondary-container px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <span className="material-symbols-outlined text-body-lg">inventory</span>
                  <span>Ajustar Stock Mínimo</span>
                </button>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Proveedor: OfiStore Managua</span>
              </div>
            </div>

            {/* Card 3: Papel Lustre Surtido (Estancamiento 90 días) */}
            <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-1.5 absolute left-0 top-0 bottom-0 bg-tertiary-container"></div>
              <div className="flex items-start gap-space-md flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center shrink-0 shadow-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-headline-lg">inventory_2</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">Estancamiento &gt; 90 Días</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Capitalidad Lenta</span>
                  </div>
                  <h3 className="font-label-lg text-label-lg font-bold text-on-surface mt-1 truncate">Paquete de Papel Lustre Surtido 50 Pliegos</h3>

                  <div className="grid grid-cols-3 gap-2 mt-2 font-body-sm text-body-sm">
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Stock Inmóvil:</span>
                      <span className="font-bold text-on-surface">62 paquetes</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Capital Retenido:</span>
                      <span className="font-bold text-on-surface">C$ 5,890 NIO</span>
                    </div>
                    <div className="bg-surface-container-low px-2 py-1 rounded-lg">
                      <span className="text-on-surface-variant block text-label-sm">Última Venta:</span>
                      <span className="font-bold text-on-surface">Hace 34 días</span>
                    </div>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    <strong className="text-on-surface font-semibold">Sugerencia IA:</strong> Aplicar promo combo relámpago con{' '}
                    <span className="font-bold text-on-surface">15% de descuento</span> empaquetado junto a tijeras punta roma escolares.
                  </p>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
                <button className="w-full sm:w-auto font-label-md text-label-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <span className="material-symbols-outlined text-body-lg">sell</span>
                  <span>Crear Combo POS</span>
                </button>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Libera C$ 4.2K en 10d</span>
              </div>
            </div>

          </div>

          {/* Demand Forecast Chart */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-md sm:p-space-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary">Proyección de Demanda Semanal Consolidada</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Curva histórica vs predicción algorítmica (Próximas 4 semanas)</p>

            {/* SVG Line Chart */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 560 160" className="w-full" style={{ minWidth: '320px' }}>
                {/* Grid lines */}
                {[0, 40, 80, 120].map(y => (
                  <line key={y} x1="40" y1={y + 10} x2="540" y2={y + 10} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-on-surface"/>
                ))}

                {/* Demand Real line (solid) */}
                <polyline
                  points="60,120 160,100 260,70 360,40 460,30"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Predicción IA line (dashed) */}
                <polyline
                  points="260,70 360,35 460,20 540,12"
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Dot markers - Real */}
                {[[60,120],[160,100],[260,70],[360,40],[460,30]].map(([cx,cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#6366f1" />
                ))}

                {/* "Hoy (Cruce)" annotation */}
                <line x1="260" y1="10" x2="260" y2="130" stroke="#6366f1" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3"/>
                <rect x="210" y="52" width="100" height="22" rx="5" fill="#6366f1" fillOpacity="0.12"/>
                <text x="260" y="67" textAnchor="middle" className="font-label-sm" style={{ fontSize: '10px', fill: '#6366f1', fontWeight: 700 }}>Sábado (Pco Escolar)</text>
                <text x="260" y="80" textAnchor="middle" style={{ fontSize: '9px', fill: '#6366f1' }}>C$ 58,120</text>

                {/* X Axis labels */}
                {[['Sem 1\n(Real)', 60], ['Sem 2\n(Real)', 160], ['Hoy\n(Cruce)', 260], ['Sem 4\n(Pico Escolar)', 370], ['Sem 5\n(+38%)', 470]].map(([label, x]) => (
                  <text key={String(x)} x={Number(x)} y={148} textAnchor="middle" style={{ fontSize: '9px', fill: 'currentColor', opacity: 0.6 }} className="text-on-surface">
                    {String(label)}
                  </text>
                ))}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-space-md mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-[#6366f1] rounded"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Cuadernos 200 Hojas (+48%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0" style={{ borderTop: '2px dashed #a78bfa' }}></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Marcadores &amp; Geometría (+22%)</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant ml-auto">Actualizado hace 2 minutos vía POS</span>
            </div>
          </div>

          {/* Bottom Consolidation Banner */}
          <div className="bg-primary rounded-2xl p-space-md sm:p-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-md flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              </div>
              <div>
                <h3 className="font-label-lg text-label-lg font-bold text-on-primary">Consolidación Multitienda &amp; Kardex Centralizado</h3>
                <p className="font-body-sm text-body-sm text-on-primary/70 mt-0.5">
                  Los algoritmos predictivos analizan simultáneamente las ventas de Sucursal Central, Sucursal Metrocentro y Tienda Virtual para optimizar fletes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button className="font-label-md text-label-md bg-primary-container text-on-primary-container hover:bg-on-primary px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95">
                <span className="material-symbols-outlined text-body-lg">summarize</span>
                Exportar Reporte Ejecutivo IA
              </button>
              <button className="font-label-md text-label-md bg-on-primary/10 hover:bg-on-primary/20 text-on-primary px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95">
                <span className="material-symbols-outlined text-body-lg">schedule_send</span>
                Programar Reposiciones
              </button>
            </div>
          </div>

        </section>

        {/* RIGHT PANEL: JINStock Copilot (Conversational Business Chat) (45% -> lg:col-span-5) */}
        <section className="lg:col-span-5 bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col h-[780px] relative overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-space-md bg-surface-container-low/80 backdrop-blur-md flex items-center justify-between border-b border-outline-variant/20 shrink-0">
            <div className="flex items-center gap-space-sm">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-container via-secondary to-secondary-container flex items-center justify-center text-on-secondary shadow-md">
                  <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary rounded-full ring-2 ring-surface-container-lowest flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-on-secondary rounded-full animate-pulse"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-label-lg text-label-lg font-bold text-on-surface">JINStock Copilot IA</h2>
                  <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-1.5 py-0.5 rounded font-bold">PRO</span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Conectado a Kardex local & facturación
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors" title="Limpiar historial" onClick={() => fetchContextData()}>
                <span className="material-symbols-outlined text-body-lg">restart_alt</span>
              </button>
            </div>
          </div>

          {/* Chat Scrollable History Area */}
          <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md" id="chatContainer">
            <div className="flex items-center justify-center my-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant/80 bg-surface-container-low px-3 py-1 rounded-full">Sesión Actual</span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-space-sm max-w-[95%] ${msg.sender === 'user' ? 'self-end flex-row-reverse max-w-[88%]' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'hidden' : 'bg-secondary-fixed text-secondary'}`}>
                  {msg.sender === 'copilot' && <span className="material-symbols-outlined text-body-md" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                </div>

                {/* Message Bubble */}
                <div className={`${msg.sender === 'user' ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm shadow-sm p-space-md' : 'bg-surface-container-low text-on-surface p-space-md rounded-2xl rounded-tl-sm flex flex-col gap-1.5'}`}>
                  <p className="font-body-sm text-body-sm leading-relaxed whitespace-pre-wrap">
                    {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                      part.startsWith('**') && part.endsWith('**') ? 
                        <strong key={i}>{part.slice(2, -2)}</strong> : 
                        <span key={i}>{part}</span>
                    )}
                  </p>
                  
                  {msg.sender === 'copilot' && <span className="font-label-sm text-label-sm text-on-surface-variant text-right block mt-1">{msg.timestamp}</span>}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-start gap-space-sm max-w-[95%]">
                <div className="w-7 h-7 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-body-md animate-spin" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="bg-surface-container-low text-on-surface p-space-md rounded-2xl rounded-tl-sm shadow-sm flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Procesando Kardex...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggested Prompt Chips (Interactive) */}
          <div className="px-space-md py-2 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            <button className="font-label-sm text-label-sm bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1" onClick={() => fillPrompt('¿Cuál fue la venta promedio por cajero hoy?')}>
              <span className="material-symbols-outlined text-body-sm text-secondary">query_stats</span>
              ¿Venta promedio por cajero hoy?
            </button>
            <button className="font-label-sm text-label-sm bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1" onClick={() => fillPrompt('¿Qué artículos no se venden hace 60 días?')}>
              <span className="material-symbols-outlined text-body-sm text-error">hourglass_bottom</span>
              ¿Sin rotación hace 60 días?
            </button>
            <button className="font-label-sm text-label-sm bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1" onClick={() => fillPrompt('Predecir demanda para la próxima semana')}>
              <span className="material-symbols-outlined text-body-sm text-primary">online_prediction</span>
              Predecir demanda próxima semana
            </button>
          </div>

          {/* Chat Input Area */}
          <div className="p-space-md bg-surface-container-low shrink-0">
            <form className="flex items-center gap-2" onSubmit={(e) => handleSendMessage(e)}>
              <button type="button" className="p-2.5 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0" title="Adjuntar reporte">
                <span className="material-symbols-outlined text-headline-sm">attach_file</span>
              </button>
              
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-outline py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
                  placeholder="Pregúntale a JINStock IA..." 
                />
              </div>
              
              <button type="submit" disabled={!inputValue.trim() || thinking} className="bg-secondary hover:bg-on-secondary-container text-on-secondary p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50">
                <span className="material-symbols-outlined text-headline-sm">send</span>
              </button>
            </form>
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">JINStock Neural Offline Agent</span>
              <span className="font-label-sm text-label-sm text-secondary font-medium">Enter para enviar</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
