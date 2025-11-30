
export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-2">opt.markets</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Optimize your Polymarket liquidity provider rewards
            </p>
            <a
              href="https://x.com/optmarkets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow us on X
            </a>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Product</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <a href="/docs" className="hover:text-foreground">
                  Docs
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-foreground">
                  About
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Resources</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://docs.polymarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Polymarket Docs
                </a>
              </li>
              <li>
                <a
                  href="https://polymarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Polymarket
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/optmarkets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  X
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} opt.markets. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
