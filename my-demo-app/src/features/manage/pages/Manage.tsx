import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Text, Loader } from "@mantine/core";
import UserStatsCard from "../components/UserStatsCard";
import RoleStatsCard from "../components/RoleStatsCard";
import FeaturesStatsCard from "../components/FeaturesStatsCard";
import ChangesStatsCard from "../components/ChangesStatsCard";
import QuickAccessMatrixCard from "../components/QuickAccessMatrixCard";
import TopRolesChartCard from "../components/TopRolesChartCard";
import MostUsedFeaturesCard from "../components/MostUsedFeaturesCard";
import RecentPermissionChanges from "../components/RecentPermissionChanges";
import ActionCardsRow from "../components/ActionCardsRow";
import MainBodyWrapper from "../../../components/MainBodyWrapper";

type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: any[];
  createdAt?: string;
  lastLogin?: string | null;
};

export default function Manage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${(import.meta as any).env?.VITE_API_BASE || "http://localhost:4000"}/users`,
        { credentials: "include" }
      );
      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        throw new Error((b && b.error) || `Failed to fetch users (${resp.status})`);
      }
      const data = await resp.json();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <MainBodyWrapper title="Manage" onBack={() => navigate(-1)}>
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : (
          <div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(4, 1fr)",
                alignItems: "start",
              }}
            >
              <UserStatsCard users={users} />
              <RoleStatsCard />
              <FeaturesStatsCard />
              <ChangesStatsCard />
            </div>
            <div style={{ marginTop: 8 }}>
              <QuickAccessMatrixCard />
            </div>
            <div
              style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}
            >
              <TopRolesChartCard />
              <MostUsedFeaturesCard />
            </div>
            <div style={{ marginTop: 12 }}>
              <RecentPermissionChanges />
            </div>
            <div style={{ marginTop: 12 }}>
              <ActionCardsRow />
            </div>
          </div>
        )}
      </div>
    </MainBodyWrapper>
  );
}
