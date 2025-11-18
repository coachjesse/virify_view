import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, LogOut, RefreshCw, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout, onAuthChanged } from "@/apis/auth";
import { fetchWatchTimes, WatchTimeUser } from "@/apis/watchtimes";
import * as XLSX from "xlsx";

const WatchTimes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const [watchTimes, setWatchTimes] = useState<WatchTimeUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthChanged((user) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user?.email || "");
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    loadWatchTimes();
  }, []);

  const loadWatchTimes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWatchTimes();
      // Sort by createdAt descending (newest first)
      const sortedData = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setWatchTimes(sortedData);
    } catch (err: any) {
      setError(err.message || "Failed to load watch times");
      toast({
        title: "Error",
        description: err.message || "Failed to load watch times data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatWatchTime = (seconds: string) => {
    const totalSeconds = parseInt(seconds, 10);
    if (isNaN(totalSeconds)) return seconds;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleExportToExcel = () => {
    if (watchTimes.length === 0) {
      toast({
        title: "No data",
        description: "There is no data to export",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = watchTimes.map((item) => ({
      "First Name": item.first_name || "-",
      "Email": item.email || "-",
      "Phone": item.phone || "-",
      "IP Address": item.ip_address,
      "Watch Time (seconds)": item.video_watch_time,
      "Watch Time (formatted)": formatWatchTime(item.video_watch_time),
      "Created At": formatDate(item.createdAt),
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Watch Times");

    // Generate filename with current date
    const filename = `watch_times_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Export successful",
      description: `Exported ${watchTimes.length} records to ${filename}`,
    });
  };

  // Calculate statistics
  const totalWatchTime = watchTimes.reduce((sum, item) => {
    const seconds = parseInt(item.video_watch_time, 10);
    return sum + (isNaN(seconds) ? 0 : seconds);
  }, 0);

  const totalRecords = watchTimes.length;
  const uniqueIPs = new Set(watchTimes.map((item) => item.ip_address)).size;
  const recordsWithInfo = watchTimes.filter(
    (item) => item.first_name || item.email || item.phone
  ).length;

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">PhoneVerify</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Watch Times</h1>
              <p className="text-muted-foreground">
                View video watching time data from all users
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadWatchTimes}
                disabled={isLoading}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={watchTimes.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="text-2xl font-bold text-foreground mb-1">
                {totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatWatchTime(totalWatchTime.toString())}
              </div>
              <div className="text-sm text-muted-foreground">Total Watch Time</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {uniqueIPs.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Unique IP Addresses</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {recordsWithInfo.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Records with User Info</div>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading watch times data...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadWatchTimes} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : watchTimes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No watch time data available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Watch Time Records ({watchTimes.length.toLocaleString()})
                  </h3>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead className="text-right">Watch Time</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {watchTimes.map((item, index) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            {item.first_name || (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.email || (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.phone || (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.ip_address}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatWatchTime(item.video_watch_time)}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.video_watch_time}s)
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WatchTimes;

