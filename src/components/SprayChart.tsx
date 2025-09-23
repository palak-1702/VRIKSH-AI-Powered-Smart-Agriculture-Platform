import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface SprayChartProps {
  language: 'en' | 'hi';
}

const data = [
  { day: 'Mon', spray: 0.8, healthy: 12, unhealthy: 3 },
  { day: 'Tue', spray: 1.2, healthy: 15, unhealthy: 2 },
  { day: 'Wed', spray: 0.5, healthy: 18, unhealthy: 1 },
  { day: 'Thu', spray: 0.9, healthy: 16, unhealthy: 4 },
  { day: 'Fri', spray: 0.7, healthy: 20, unhealthy: 2 },
  { day: 'Sat', spray: 1.1, healthy: 14, unhealthy: 3 },
  { day: 'Today', spray: 0.6, healthy: 22, unhealthy: 1 },
];

export default function SprayChart({ language }: SprayChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-semibold mb-4 text-lg">
        {language === 'en' ? '💧 Weekly Spray Usage' : '💧 साप्ताहिक छिड़काव उपयोग'}
      </h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">2.8L</p>
          <p className="text-sm text-gray-600">
            {language === 'en' ? 'Total Saved' : 'कुल बचत'}
          </p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">5.8L</p>
          <p className="text-sm text-gray-600">
            {language === 'en' ? 'Used This Week' : 'इस सप्ताह उपयोग'}
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">68%</p>
          <p className="text-sm text-gray-600">
            {language === 'en' ? 'Efficiency' : 'दक्षता'}
          </p>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" />
            <YAxis />
            <Bar dataKey="spray" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === data.length - 1 ? "#3B82F6" : "#93C5FD"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>{language === 'en' ? 'Spray amount in liters per day' : 'प्रति दिन छिड़काव की मात्रा (लीटर में)'}</p>
      </div>
    </div>
  );
}