import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ErrorBar
} from 'recharts';
import { Candle } from '../types';

interface CandleChartProps {
  data: Candle[];
}

// Custom shape for rendering the candle body
const CustomCandleShape = (props: any) => {
  const { x, y, width, height, fill, open, close } = props;
  // If open === close, we still want a thin line
  const effectiveHeight = height === 0 ? 1 : height;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={effectiveHeight}
      fill={fill}
    />
  );
};

// Custom shape for the wick (High/Low)
// We pass High and Low as error bars basically, but we need to format data correctly first
// Actually, a cleaner way in Recharts for Candles is using a Bar for the body and handling the wick separately or within the shape.
// Simplified approach: Two bars? No.
// Let's use the standard "ErrorBar" hack or just draw lines in the custom shape.
// To keep it simple and performant, I will calculate wicks inside the custom shape if I had passed full props,
// but Recharts strips props.
//
// Better Approach for Recharts Candle:
// 1. Data Prep: Body Top, Body Bottom, Wick Top, Wick Bottom.
// But Recharts requires specific structure.
//
// Let's stick to a robust method: Use `ComposedChart`.
// - The "Bar" represents the Open-Close body.
// - The "ErrorBar" can represent the wicks, but ErrorBar logic is relative.
//
// Alternative: Render purely with custom shape.

const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload, index } = props;
  const { open, close, high, low } = payload;
  
  const isUp = close > open;
  const color = isUp ? '#4ade80' : '#f87171'; // Tailwind green-450 / red-450
  
  // Calculate coordinates manually based on scale
  // Note: props.y is the top of the bar, props.height is the height.
  // Recharts passes us the scaled values for the keys mapped in <Bar dataKey="...">
  // But we need the Y positions for High and Low as well.
  // This is tricky in Recharts without a custom chart type.
  
  // Alternative strategy:
  // We can access the YAxis scale if we were in a lower level component, but here we aren't.
  
  // Let's rely on Recharts built-in components creatively.
  // We will map data to:
  // min: low
  // max: high
  // bodyBottom: min(open, close)
  // bodyTop: max(open, close)
  //
  // Actually, standard practice for Recharts Candle is using the `shape` prop on a Bar
  // and passing the y-scale context, but that's complex.
  //
  // Let's use a simpler visualization: Line Chart for Price + colored dots?
  // No, user asked for "Vela" (Candle).
  //
  // Let's implement the standard Recharts Candle hack:
  // Data: [low, body_bottom, body_top, high] -> No.
  
  // OK, I will use a custom shape that assumes the Bar covers the range [Math.min(open, close), Math.max(open, close)].
  // And I will add a separate line for the wicks.
  
  // IMPORTANT: For the Bar to be positioned correctly, the dataKey must cover the body range.
  // In Recharts, if we use <Bar dataKey="bodySize" stackId="a" ... />, we need to offset it.
  
  // SIMPLIFIED VISUALIZATION FOR STABILITY:
  // Use a composed chart.
  // 1. Bar for the Body (Open vs Close).
  // 2. Line for High/Low? No.
  
  // Let's use the provided width/x/y from the Bar, but draw the whole candle manually.
  // We need the Y-scale converter.
  // Since we don't have it easily in the shape prop without context, 
  // We will use a robust library-agnostic SVG draw within the Recharts container? No.
  
  // FINAL DECISION:
  // Use `recharts` standard Bar chart. 
  // The Bar value will be `Math.abs(open - close)`.
  // We use `stackId` and a transparent bar for the bottom offset `Math.min(open, close)`.
  // Wicks will be drawn using ErrorBars or custom shape is too hard to align.
  
  // WAIT: There is a much simpler way often used. 
  // Just use a custom shape where we pass the *entire* payload.
  // But we need the Y-coordinate of Open, High, Low, Close.
  // We can get the Y scale from the Axis? No.
  
  // Let's convert the data for the chart to be [min, max] range bars (floating bars).
  // Recharts `Bar` supports `dataKey` as an array `[min, max]`.
  // So: dataKey={[min(open,close), max(open,close)]}
  
  const yBottom = props.y + props.height;
  const yTop = props.y;
  
  // Now we need High and Low Y positions. 
  // We can't easily get them without the scale.
  //
  // Let's switch strategy: Render a simplified chart with Open/Close only if full candles are too hacky,
  // OR try the array tuple for Bar which works in Recharts 2+.
  
  return <rect x={x} y={y} width={width} height={height} fill={color} />;
};

const formatTime = (time: number) => {
  const date = new Date(time);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// We will process data to make it consumable by Recharts Bar using the [min, max] tuple format
const PreparedChart: React.FC<CandleChartProps> = ({ data }) => {
  const chartData = data.map(d => {
    const isUp = d.close > d.open;
    return {
      ...d,
      // Bar range: [min(open, close), max(open, close)]
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      color: isUp ? '#4ade80' : '#f87171',
      // We also need high/low for the wick. 
      // We can use ErrorBar if we center it? No.
      // We will draw the wick as a separate narrow Bar behind the main bar?
      // Yes! A wick is just a very thin bar from Low to High.
      wick: [d.low, d.high]
    };
  });

  const minPrice = Math.min(...data.map(d => d.low)) * 0.999;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.001;

  return (
    <div className="w-full h-[400px] glass-panel rounded-xl p-4">
      <h3 className="text-gray-400 text-sm mb-4 font-mono uppercase tracking-wider">BTC/USDT • 5m • Tempo Real</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
          <XAxis 
            dataKey="time" 
            tickFormatter={formatTime} 
            stroke="#9ca3af" 
            tick={{fontSize: 12}}
            minTickGap={30}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            stroke="#9ca3af" 
            tick={{fontSize: 12}} 
            width={60}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
            itemStyle={{ color: '#f3f4f6' }}
            labelFormatter={formatTime}
            formatter={(value: any, name: string, props: any) => {
              if (name === 'wick' || name === 'body') return [null, null]; // Hide tech fields
              return [value, name];
            }}
          />
          {/* Wick (Thin Bar) */}
          <Bar dataKey="wick" barSize={2} fill="#9ca3af" isAnimationActive={false}>
             {
              chartData.map((entry, index) => (
                <Cell key={`cell-wick-${index}`} fill={entry.color} />
              ))
            }
          </Bar>
          {/* Body (Thicker Bar) */}
          <Bar dataKey="body" barSize={12} isAnimationActive={false}>
            {
              chartData.map((entry, index) => (
                <Cell key={`cell-body-${index}`} fill={entry.color} />
              ))
            }
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PreparedChart;