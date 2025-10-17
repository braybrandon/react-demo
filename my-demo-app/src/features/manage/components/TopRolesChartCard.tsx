import { Card, Text } from "@mantine/core";
import CornerRibbon from "../../../components/CornerRibbon";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function TopRolesChartCard() {
  const roles = [
    { name: "Admin", value: 45 },
    { name: "Manager", value: 127 },
    { name: "Editor", value: 89 },
    { name: "Viewer", value: 234 },
    { name: "Analyst", value: 67 },
    { name: "Developer", value: 98 },
  ];

  const labels = roles.map((r) => r.name);
  const data = {
    labels,
    datasets: [
      {
        label: "Users Assigned",
        data: roles.map((r) => r.value),
        backgroundColor: "#6366f1",
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "bottom", labels: { color: "#fff" } },
      datalabels: {
        // place labels above the bars
        color: "#fff",
        anchor: "end",
        align: "end",
        clamp: true,
        formatter: (value: any) => String(value),
        font: { weight: "700" },
      },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { color: "#fff" },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#fff" },
        grid: { color: "#3b3b3b" },
        beginAtZero: true,
        title: { display: true, text: "Number of Users", color: "#fff" },
      },
    },
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ width: "100%", height: 340, position: "relative" }}
    >
      <CornerRibbon text="Coming soon" color="#7c3aed" position="top-left" />
      <Text style={{ fontSize: 16, fontWeight: 700 }}>Top Roles by Assignment</Text>
      <Text style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>
        Most assigned roles across your organization
      </Text>
      <div style={{ marginTop: 16, height: 260 }}>
        <Bar data={data} options={options} />
      </div>
    </Card>
  );
}
