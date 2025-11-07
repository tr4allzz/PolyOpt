export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold mb-2">opt.markets</h3>
            <p className="text-sm text-muted-foreground">
              Optimize your Polymarket liquidity provider rewards
            </p>
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
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">About</h4>
            <p className="text-sm text-muted-foreground">
              Built with Next.js, Wagmi, and Polymarket API
            </p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} opt.markets. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
