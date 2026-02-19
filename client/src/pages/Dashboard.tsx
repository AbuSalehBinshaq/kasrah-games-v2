import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Edit2, Trash2, Eye, TrendingUp, BarChart3, Users, DollarSign } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch ads
  const { data: adsData, isLoading: adsLoading } = trpc.admin.getAds.useQuery();

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Mock data for charts
  const impressionsData = [
    { date: "Mon", impressions: 4000, clicks: 2400 },
    { date: "Tue", impressions: 3000, clicks: 1398 },
    { date: "Wed", impressions: 2000, clicks: 9800 },
    { date: "Thu", impressions: 2780, clicks: 3908 },
    { date: "Fri", impressions: 1890, clicks: 4800 },
    { date: "Sat", impressions: 2390, clicks: 3800 },
    { date: "Sun", impressions: 3490, clicks: 4300 },
  ];

  const adTypeData = [
    { name: "Interstitial", value: 45 },
    { name: "Rewarded", value: 35 },
    { name: "Banner", value: 20 },
  ];

  const COLORS = ["#667eea", "#764ba2", "#f093fb"];

  const stats = [
    {
      title: "Total Impressions",
      value: "24,580",
      change: "+12.5%",
      icon: Eye,
      color: "bg-blue-500",
    },
    {
      title: "Total Clicks",
      value: "3,240",
      change: "+8.2%",
      icon: BarChart3,
      color: "bg-purple-500",
    },
    {
      title: "Active Users",
      value: "1,829",
      change: "+5.1%",
      icon: Users,
      color: "bg-green-500",
    },
    {
      title: "Revenue",
      value: "$4,250",
      change: "+15.3%",
      icon: DollarSign,
      color: "bg-orange-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Ad
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-green-600 mt-1">{stat.change} from last week</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ads">Ads Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Impressions & Clicks Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Impressions & Clicks</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={impressionsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="impressions" stroke="#667eea" />
                      <Line type="monotone" dataKey="clicks" stroke="#764ba2" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Ad Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Ad Type Distribution</CardTitle>
                  <CardDescription>By percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={adTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {adTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ads Management Tab */}
          <TabsContent value="ads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Ads</CardTitle>
                <CardDescription>Create, edit, and delete advertisements</CardDescription>
              </CardHeader>
              <CardContent>
                {adsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adsData?.ads && adsData.ads.length > 0 ? (
                      <div className="space-y-3">
                        {adsData.ads.map((ad: any) => (
                          <div
                            key={ad.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold">{ad.title}</h3>
                              <p className="text-sm text-gray-600">
                                Type: {ad.type} | Size: {ad.size} | Impressions: {ad.impressions}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No ads created yet. Click "New Ad" to get started.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Detailed analytics for all ads</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={impressionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" fill="#667eea" />
                    <Bar dataKey="clicks" fill="#764ba2" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
