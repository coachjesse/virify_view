import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, LogOut, RefreshCw, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout, onAuthChanged } from "@/apis/auth";
import { fetchWatchTimes, WatchTimeUser } from "@/apis/watchtimes";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 15;
type PaginationItem = number | "left-ellipsis" | "right-ellipsis";

const WatchTimes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const [watchTimes, setWatchTimes] = useState<WatchTimeUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
      setWatchTimes(sortedData.slice(15));
      setCurrentPage(1);
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

  const filteredWatchTimes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return watchTimes;
    }

    return watchTimes.filter((item) => {
      const values = [
        item.first_name,
        item.email,
        item.phone,
        item.ip_address,
        item.video_watch_time,
        formatWatchTime(item.video_watch_time),
        formatDate(item.createdAt),
        item.createdAt,
      ];

      return values.some((value) =>
        (value || "").toString().toLowerCase().includes(query)
      );
    });
  }, [searchQuery, watchTimes]);

  const hasActiveSearch = searchQuery.trim().length > 0;
  const baseTotalRecords = watchTimes.length;

  const handleExportToExcel = () => {
    if (filteredWatchTimes.length === 0) {
      toast({
        title: "No data",
        description: hasActiveSearch
          ? "There is no matching data to export. Clear your search and try again."
          : "There is no data to export",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = filteredWatchTimes.map((item) => ({
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
      description: `Exported ${filteredWatchTimes.length} record${
        filteredWatchTimes.length === 1 ? "" : "s"
      } to ${filename}`,
    });
  };

  // Calculate statistics
  const totalWatchTime = filteredWatchTimes.reduce((sum, item) => {
    const seconds = parseInt(item.video_watch_time, 10);
    return sum + (isNaN(seconds) ? 0 : seconds);
  }, 0);

  const totalRecords = filteredWatchTimes.length;
  const uniqueIPs = new Set(filteredWatchTimes.map((item) => item.ip_address)).size;
  const recordsWithInfo = filteredWatchTimes.filter(
    (item) => item.first_name || item.email || item.phone
  ).length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedWatchTimes = filteredWatchTimes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );
  const displayedRangeStart = totalRecords === 0 ? 0 : startIndex + 1;
  const displayedRangeEnd = startIndex + paginatedWatchTimes.length;

  const paginationItems: PaginationItem[] = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: PaginationItem[] = [1];
    const showLeftEllipsis = currentPage > 3;
    const showRightEllipsis = currentPage < totalPages - 2;

    if (showLeftEllipsis) {
      items.push("left-ellipsis");
    }

    const middleStart = showLeftEllipsis ? currentPage - 1 : 2;
    const middleEnd = showRightEllipsis ? currentPage + 1 : totalPages - 1;

    for (let page = middleStart; page <= middleEnd; page++) {
      items.push(page);
    }

    if (showRightEllipsis) {
      items.push("right-ellipsis");
    }

    items.push(totalPages);

    return items;
  })();

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

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
              <Button onClick={handleExportToExcel} disabled={filteredWatchTimes.length === 0}>
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
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Watch Time Records ({totalRecords.toLocaleString()}
                      {hasActiveSearch
                        ? ` of ${baseTotalRecords.toLocaleString()}`
                        : ""}
                      )
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                      {hasActiveSearch && (
                        <>
                          {" "}
                          - Showing filtered results
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
                    <Input
                      value={searchQuery}
                      onChange={(event) => handleSearchChange(event.target.value)}
                      placeholder="Search by name, email, phone or IP"
                      className="w-full md:w-72"
                    />
                    {hasActiveSearch && (
                      <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                {filteredWatchTimes.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">
                      No results found for{" "}
                      <span className="font-semibold text-foreground">
                        "{searchQuery}"
                      </span>
                    </p>
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={handleClearSearch}>
                        Clear search
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
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
                          {paginatedWatchTimes.map((item, index) => (
                            <TableRow key={item._id}>
                              <TableCell className="font-medium text-muted-foreground">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell>
                                {item.first_name || (
                                  <span className="text-muted-foreground italic">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.email || (
                                  <span className="text-muted-foreground italic">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.phone || (
                                  <span className="text-muted-foreground italic">
                                    -
                                  </span>
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
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <span className="text-sm text-muted-foreground">
                        Showing {displayedRangeStart.toLocaleString()}-
                        {displayedRangeEnd.toLocaleString()} of{" "}
                        {totalRecords.toLocaleString()}{" "}
                        {hasActiveSearch ? "matching records" : "records"}
                        {hasActiveSearch && (
                          <>
                            {" "}
                            (out of {baseTotalRecords.toLocaleString()} total)
                          </>
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        {paginationItems.map((item, idx) =>
                          typeof item === "number" ? (
                            <Button
                              key={`page-${item}`}
                              variant={item === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(item)}
                            >
                              {item}
                            </Button>
                          ) : (
                            <span
                              key={`${item}-${idx}`}
                              className="text-sm text-muted-foreground px-2"
                            >
                              &hellip;
                            </span>
                          )
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WatchTimes;

