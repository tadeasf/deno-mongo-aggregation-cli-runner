import { DB } from "./db";
import type { MedianQueryDuration } from "../lib/types";
import { write } from "fs";

export async function generateCharts(db: DB) {
  const data: MedianQueryDuration[] = await db.getMedianQueryDurations();

  const chartHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Query Performance Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="myChart" width="800" height="400"></canvas>
  <script>
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, ${JSON.stringify(createChartConfig(data))});
  </script>
</body>
</html>
  `;

  await Bun.write("query_performance_chart.html", chartHtml);
  console.log("Chart generated: query_performance_chart.html");
}

function createChartConfig(data: MedianQueryDuration[]): Record<string, unknown> {
  return {
    type: 'bar',
    data: {
      labels: data.map(row => `${row.uri}\n${row.database}\n${row.collection}`),
      datasets: [{
        label: 'Median Query Duration (seconds)',
        data: data.map(row => row.medianDuration),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Duration (seconds)'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Median Query Duration by URI, Database, and Collection'
        },
        legend: {
          display: false
        }
      }
    }
  };
}