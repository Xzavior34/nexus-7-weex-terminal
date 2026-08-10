import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Server, Check, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import {
  getEngineToken,
  getEngineApiUrl,
  setStoredEngineToken,
  setStoredEngineApiUrl,
  sanitizeToken,
  api,
} from "@/services/api";

interface ApiConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved?: () => void;
}

export function ApiConfigModal({ open, onOpenChange, onConfigSaved }: ApiConfigModalProps) {
  const [apiUrl, setApiUrl] = useState("");
  const [token, setToken] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setApiUrl(getEngineApiUrl());
      setToken(getEngineToken());
      setTestResult(null);
    }
  }, [open]);

  const handleSave = () => {
    const cleanUrl = apiUrl.trim();
    const cleanToken = sanitizeToken(token);

    setStoredEngineApiUrl(cleanUrl);
    setStoredEngineToken(cleanToken);
    setToken(cleanToken);

    setTestResult({ success: true, message: "Settings saved to local storage." });
    if (onConfigSaved) onConfigSaved();
    setTimeout(() => onOpenChange(false), 800);
  };

  const handleClear = () => {
    setStoredEngineApiUrl("");
    setStoredEngineToken("");
    setApiUrl(getEngineApiUrl());
    setToken("");
    setTestResult({ success: true, message: "Cleared saved local credentials." });
    if (onConfigSaved) onConfigSaved();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const cleanUrl = apiUrl.trim();
    const cleanToken = sanitizeToken(token);

    try {
      // Temporarily store credentials for testing
      setStoredEngineApiUrl(cleanUrl);
      setStoredEngineToken(cleanToken);
      setToken(cleanToken);

      const res = await api.getStatus();
      setTestResult({
        success: true,
        message: `Connected successfully! Engine status: "${res.status}". Equity: $${
          res.last_equity ?? res.last_equity_usd ?? "0.00"
        }`,
      });
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setTestResult({
        success: false,
        message:
          err.message ||
          "Connection failed. Please check your Engine Bearer token.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/80 text-foreground backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-sans">
            <Key className="w-5 h-5 text-primary" />
            Nexus-7 Engine API Configuration
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure the Engine API Base URL and secret Bearer Token to authenticate API requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl" className="text-xs font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-primary" />
              Engine API Base URL
            </Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://nexus7-engine.onrender.com"
              className="bg-background/50 border-border/60 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Default: <code className="text-primary">https://nexus7-engine.onrender.com</code>
            </p>
          </div>

          {/* Bearer Token */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-xs font-semibold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Engine Bearer Token (<code className="text-xs font-mono">API_AUTH_TOKEN</code>)
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your API_AUTH_TOKEN here..."
              className="bg-background/50 border-border/60 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ⚠️ Must match the <code className="text-amber-400">API_AUTH_TOKEN</code> environment variable configured on your Render dashboard (<code className="text-xs font-mono">nexus7-engine</code>).
            </p>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div>{testResult.message}</div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="border-primary/40 text-primary hover:bg-primary/10 text-xs"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive text-xs"
              title="Clear stored token"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs"
            >
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
