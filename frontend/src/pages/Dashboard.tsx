import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "@/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Upload, LogOut, CheckCircle2, Download, Settings, Key, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout, onAuthChanged } from "@/apis/auth";
import { getApiKey, setApiKey as saveApiKey, getApiKeyDisplay, verifyPhoneNumber } from "@/apis/numverify";
import { analyzeExcelFile, previewExcelFile, ExcelPreview, verifyAndCategorizePhones, exportToExcel, VerificationResult } from "@/hooks/excel-process";
import * as XLSX from 'xlsx';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [previewData, setPreviewData] = useState<ExcelPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [isTestingApiKey, setIsTestingApiKey] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelProcessingRef = useRef<boolean>(false);

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

  // Load API key on mount
  useEffect(() => {
    const fetchApiKey = async () => {
    const currentKey = await getApiKey();
    setApiKey(currentKey);
    setApiKeyInput(currentKey);

    }
    fetchApiKey();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const updateProgress = (current: number, total: number) => {
    const percentage = Math.round((current / total) * 100);
    setProgress(Math.min(percentage, 95)); // Cap at 95% until complete
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];

    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setSelectedColumnIndex(null);

    // Preview the file
    try {
      const preview = await previewExcelFile(file);
      if (preview.success) {
        setPreviewData(preview);
      } else {
        throw new Error(preview.error || "Failed to preview file");
      }
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error.message || "An error occurred while previewing the file",
        variant: "destructive",
      });
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || selectedColumnIndex === null) {
      toast({
        title: "Column not selected",
        description: "Please select a column containing phone numbers",
        variant: "destructive",
      });
      return;
    }

    // Reset cancel flag
    cancelProcessingRef.current = false;
    setIsProcessing(true);
    setProgress(0);
    setProcessingStatus("Reading file...");

    try {
      setProcessingStatus("Extracting phone numbers...");
      updateProgress(5, 100);

      const result = await verifyAndCategorizePhones(
        selectedFile,
        selectedColumnIndex,
        (current, total, status) => {
          setProcessingStatus(status);
          updateProgress(10 + (current / total) * 85, 100);
        },
        () => cancelProcessingRef.current // shouldCancel callback
      );

      setProgress(100);
      
      if (result.cancelled) {
        setProcessingStatus("Processing cancelled");
        toast({
          title: "Processing cancelled",
          description: `Processed ${result.processedCount} of ${result.totalCount} numbers. You can download the results.`,
          variant: "default",
        });
      } else {
        setProcessingStatus("Verification complete!");
        toast({
          title: "Verification complete!",
          description: `Verified ${result.totalPhoneNumbers} numbers: ${result.validNumbers.length} valid (${result.mobileNumbers.length} mobile, ${result.landlineNumbers.length} landline), ${result.invalidNumbers.length} invalid`,
        });
      }

      if (result.success) {
        setVerificationResult(result);
      } else {
        throw new Error(result.error || "Failed to verify phone numbers");
      }
    } catch (error: any) {
      setProgress(0);
      toast({
        title: "Verification failed",
        description: error.message || "An error occurred while verifying phone numbers",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      cancelProcessingRef.current = false;
    }
  };

  const handleCancelProcessing = () => {
    cancelProcessingRef.current = true;
    setProcessingStatus("Cancelling...");
  };

  const handleDownloadMobile = () => {
    if (!verificationResult || verificationResult.mobileNumbers.length === 0) {
      toast({
        title: "No mobile numbers",
        description: "There are no mobile numbers to download",
        variant: "destructive",
      });
      return;
    }

    const filename = `mobile_numbers_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(
      verificationResult.mobileNumbers, 
      filename,
      verificationResult.originalData,
      verificationResult.selectedColumnIndex
    );
    toast({
      title: "Download started",
      description: `Downloading ${verificationResult.mobileNumbers.length} mobile numbers`,
    });
  };

  const handleDownloadLandline = () => {
    if (!verificationResult || verificationResult.landlineNumbers.length === 0) {
      toast({
        title: "No landline numbers",
        description: "There are no landline numbers to download",
        variant: "destructive",
      });
      return;
    }

    const filename = `landline_numbers_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(
      verificationResult.landlineNumbers, 
      filename,
      verificationResult.originalData,
      verificationResult.selectedColumnIndex
    );
    toast({
      title: "Download started",
      description: `Downloading ${verificationResult.landlineNumbers.length} landline numbers`,
    });
  };

  const getColumnLetter = (index: number): string => {
    return XLSX.utils.encode_col(index);
  };

  const handleOpenSettings = async () => {
    const currentKey = await getApiKey();
    console.log(currentKey);
    setApiKeyInput(currentKey);
    setIsSettingsOpen(true);
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKeyInput.trim();
    
    if (!trimmedKey) {
      toast({
        title: "API Key Required",
        description: "Please enter a NumVerify API key",
        variant: "destructive",
      });
      return;
    }

    // Save the API key to localStorage using the API function
    saveApiKey(trimmedKey);
    
    // Update local state
    setApiKey(trimmedKey);
    
    toast({
      title: "API Key Saved",
      description: "Your NumVerify API key has been saved successfully.",
    });
    setIsSettingsOpen(false);
  };

  const handleTestApiKey = async (apiKey: string) => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to test",
        variant: "destructive",
      });
      return;
    }

    setIsTestingApiKey(true);
    try {
      // Temporarily save the key to test it
      
      const testResult = await verifyPhoneNumber(apiKey, "+14158586273");
      
      if ('error' in testResult) {
        if (testResult.error.type === 'cors_error') {
          toast({
            title: "CORS Error",
            description: "API key format appears valid, but CORS restrictions prevent direct browser access. Consider using a backend proxy.",
          });
        } else if (testResult.error.type === 'missing_api_key') {
          toast({
            title: "Invalid API Key",
            description: "The API key is invalid or not recognized by NumVerify.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "API Key Test",
            description: `API responded: ${testResult.error.info}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "API Key Valid",
          description: "Your API key is working correctly!",
        });
      }

    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "An error occurred while testing the API key",
        variant: "destructive",
      });
    } finally {
      setIsTestingApiKey(false);
    }
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
            <Button onClick={handleOpenSettings} variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Upload and verify phone numbers in bulk</p>
          </div>

          {/* Upload Card */}
          <Card className="p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Upload Phone Numbers
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Upload an Excel file (.xlsx, .xls) containing phone numbers to start the verification process
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
              />
              <Button 
                size="lg" 
                onClick={handleFileSelect}
                disabled={isProcessing || !!previewData}
              >
                <Upload className="w-5 h-5 mr-2" />
                {previewData ? "File Selected" : "Select Excel File"}
              </Button>
              
              {isProcessing && (
                <div className="w-full max-w-md space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{processingStatus}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelProcessing}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Processing
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Preview Table */}
          {previewData && previewData.success && !isProcessing && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      File Preview: {previewData.fileName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Showing first 10 rows of {previewData.totalRows} total rows. Select a column containing phone numbers.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                      setSelectedColumnIndex(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Change File
                  </Button>
                </div>
                
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Row</TableHead>
                        {Array.from({ length: previewData.columns }, (_, i) => (
                          <TableHead
                            key={i}
                            className={`cursor-pointer transition-colors ${
                              selectedColumnIndex === i
                                ? "bg-primary/20 font-semibold"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => setSelectedColumnIndex(i)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {getColumnLetter(i)}
                              {selectedColumnIndex === i && (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.previewRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {rowIndex + 1}
                          </TableCell>
                          {Array.from({ length: previewData.columns }, (_, colIndex) => (
                            <TableCell
                              key={colIndex}
                              className={`${
                                selectedColumnIndex === colIndex
                                  ? "bg-primary/10 font-medium"
                                  : ""
                              }`}
                            >
                              {row[colIndex] !== null && row[colIndex] !== undefined
                                ? String(row[colIndex])
                                : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedColumnIndex !== null && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Selected column: <span className="font-semibold text-foreground">
                        {getColumnLetter(selectedColumnIndex)}
                      </span>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleProcess}
                      disabled={isProcessing}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Process All Rows
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="text-2xl font-bold text-foreground mb-1">
                {verificationResult?.totalPhoneNumbers || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Verifications</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {verificationResult?.validNumbers.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Valid Numbers</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {verificationResult?.mobileNumbers.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Mobile Numbers</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {verificationResult?.landlineNumbers.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Landline Numbers</div>
            </Card>
          </div>

          {/* Verification Results and Downloads */}
          {verificationResult && verificationResult.success && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Verification Results
                    </h3>
                    {verificationResult.cancelled && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        Processing was cancelled. Showing {verificationResult.processedCount} of {verificationResult.totalCount} processed numbers.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVerificationResult(null);
                      setPreviewData(null);
                      setSelectedFile(null);
                      setSelectedColumnIndex(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Start New Verification
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div>
                        <div className="text-sm text-muted-foreground">Mobile Numbers</div>
                        <div className="text-2xl font-bold text-green-600">
                          {verificationResult.mobileNumbers.length}
                        </div>
                      </div>
                      <Button
                        onClick={handleDownloadMobile}
                        disabled={verificationResult.mobileNumbers.length === 0}
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                      <div>
                        <div className="text-sm text-muted-foreground">Landline Numbers</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {verificationResult.landlineNumbers.length}
                        </div>
                      </div>
                      <Button
                        onClick={handleDownloadLandline}
                        disabled={verificationResult.landlineNumbers.length === 0}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                {verificationResult.invalidNumbers.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Invalid Numbers</div>
                      <div className="text-xl font-bold text-red-600">
                        {verificationResult.invalidNumbers.length}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const filename = `invalid_numbers_${new Date().toISOString().split('T')[0]}.xlsx`;
                        exportToExcel(
                          verificationResult.invalidNumbers, 
                          filename,
                          verificationResult.originalData,
                          verificationResult.selectedColumnIndex
                        );
                        toast({
                          title: "Download started",
                          description: `Downloading ${verificationResult.invalidNumbers.length} invalid numbers`,
                        });
                      }}
                      disabled={verificationResult.invalidNumbers.length === 0}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}

                {/* Download all processed numbers option for cancelled processing */}
                {verificationResult.cancelled && verificationResult.totalPhoneNumbers > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">All Processed Numbers</div>
                        <div className="text-lg font-bold text-blue-600">
                          {verificationResult.totalPhoneNumbers} numbers processed
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Includes both valid and invalid numbers processed before cancellation
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const allProcessed = [
                            ...verificationResult.validNumbers,
                            ...verificationResult.invalidNumbers
                          ];
                          const filename = `processed_numbers_${new Date().toISOString().split('T')[0]}.xlsx`;
                          exportToExcel(
                            allProcessed, 
                            filename,
                            verificationResult.originalData,
                            verificationResult.selectedColumnIndex
                          );
                          toast({
                            title: "Download started",
                            description: `Downloading ${allProcessed.length} processed numbers`,
                          });
                        }}
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Verifications
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Verifications</h3>
            <div className="text-center py-12 text-muted-foreground">
              No verifications yet. Upload an Excel file to get started.
            </div>
          </Card> */}
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              NumVerify API Settings
            </DialogTitle>
            <DialogDescription>
              Enter your NumVerify API key. You can get one from{" "}
              <a
                href="https://apilayer.com/marketplace/number_verification-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                apilayer.com
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your NumVerify API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                disabled={isTestingApiKey}
              />
              {apiKey && (
                <p className="text-xs text-muted-foreground">
                  Current key: {getApiKeyDisplay(apiKeyInput)}
                </p>
              )}
            </div>
            {!apiKey && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ No API key configured. Phone verification will not work until you add a valid API key.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleTestApiKey(apiKeyInput)}
              disabled={isTestingApiKey || !apiKeyInput.trim()}
            >
              {isTestingApiKey ? "Testing..." : "Test API Key"}
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={isTestingApiKey || !apiKeyInput.trim()}
            >
              {isTestingApiKey ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
