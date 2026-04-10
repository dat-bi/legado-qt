import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { testConnection } from '@/api/legadoApi';
import { ArrowLeft, Wifi, WifiOff, Server, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { legadoUrl, setLegadoUrl, wsAutoPort, setWsAutoPort, isConnected, setConnected } = useAppStore();
  const [urlInput, setUrlInput] = useState(legadoUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    if (!urlInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const ok = await testConnection(urlInput.trim().replace(/\/+$/, ''));
    setTesting(false);
    setTestResult(ok ? 'success' : 'error');
    if (ok) {
      setLegadoUrl(urlInput.trim().replace(/\/+$/, ''));
      setConnected(true);
    }
  };

  const handleDisconnect = () => {
    setLegadoUrl('');
    setConnected(false);
    setUrlInput('');
    setTestResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kệ sách</span>
        </button>

        <h1 className="text-2xl font-bold font-serif mb-6 text-foreground">Cài đặt</h1>

        {/* Connection card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Server className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold font-serif text-foreground">Kết nối Legado</h2>
              <p className="text-[11px] text-muted-foreground">Máy chủ đọc sách</p>
            </div>
            <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
              isConnected ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
            </span>
          </div>

          <div className="p-5">
            <div className="mb-4">
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Địa chỉ máy chủ API</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com hoặc http://192.168.1.100:1122"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-transparent focus:border-primary/30 focus:outline-none transition-all"
                />
                <button
                  onClick={handleTest}
                  disabled={testing || !urlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {testing ? 'Đang...' : 'Kết nối'}
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex-1 pr-4">
                <label className="text-sm font-semibold text-foreground block">Tự động tính cổng WebSocket</label>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  Mặc định dùng cổng (HTTP + 1). Tắt nếu bạn sử dụng Tunnel/Proxy và đã cấu định tuyến path.
                </p>
              </div>
              <button
                onClick={() => setWsAutoPort(!wsAutoPort)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  wsAutoPort ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  wsAutoPort ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            {testResult === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/8 px-3 py-2 rounded-lg mb-4">
                <CheckCircle2 className="w-4 h-4" />
                Kết nối thành công! Đã lưu cài đặt.
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4" />
                Không thể kết nối. Kiểm tra lại địa chỉ.
              </div>
            )}

            {isConnected && (
              <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</span>
                  <p className="text-xs text-muted-foreground break-all">Đã kết nối tới {legadoUrl}</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-destructive hover:underline flex-shrink-0 ml-3"
                >
                  Ngắt kết nối
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cloudflare Tunnel Note */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
            <Server className="w-4 h-4" />
            <h2 className="text-sm font-semibold font-serif">Cloudflare Tunnel Setup</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Nếu bạn sử dụng Cloudflare Tunnel và tính năng tìm kiếm bị lỗi, hãy đảm bảo cấu hình <code className="bg-blue-500/10 px-1 rounded">config.yml</code> như sau:
          </p>
          <div className="bg-black/5 dark:bg-black/20 p-3 rounded-lg overflow-x-auto">
            <pre className="text-[10px] text-foreground leading-normal font-mono">
{`  tunnel: *********
  credentials-file: *********
  
  ingress:
  - hostname: ${urlInput.replace(/^https?:\/\//, '') || 'your-domain.com'}
    path: /searchBook
    service: http://localhost:1123
  - hostname: ${urlInput.replace(/^https?:\/\//, '') || 'your-domain.com'}
    service: http://localhost:1122
  - service: http_status:404`}
            </pre>
          </div>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-3 italic">
            * Sau khi cấu hình tunnel như trên, hãy TẮT tính năng "Tự động tính cổng WebSocket" ở bên trên.
          </p>
        </div>

        {/* About */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold font-serif mb-2 text-foreground">Về ứng dụng</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Giao diện web cho ứng dụng đọc sách Legado. Kết nối với máy chủ Legado để đồng bộ kệ sách, 
            đọc truyện trực tuyến và quản lý nguồn sách.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
            <span>v2.0</span>
            <a
              href="https://github.com/dat-bi/legado-qt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
