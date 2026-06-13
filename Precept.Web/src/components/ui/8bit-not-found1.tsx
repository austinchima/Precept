import { cn } from "../../lib/utils";
import { Button } from "./8bit-button";
import { useAuth } from "../../AuthContext";
import { Link } from "react-router-dom";

interface NotFound1Props {
  className?: string;
  cta?: string;
  description?: string;
  imageSrc?: string;
  title?: string;
}

export default function NotFound1({
  title = "SYSTEM OVERRIDE",
  description = "The requested sector is offline. Check your coordinates and try again.",
  cta = "Return to Safe Zone",
  imageSrc = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=256&auto=format&fit=crop", 
  className,
}: NotFound1Props) {
  const { isAuthenticated } = useAuth();
  const href = isAuthenticated ? "/dashboard" : "/";

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center w-full gap-5 bg-brand-secondary text-brand-text px-4 py-16 text-center md:py-24 relative overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-brand-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-brand-border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="font-heading font-bold text-7xl tracking-tighter sm:text-9xl text-brand-primary drop-shadow-[0_0_15px_rgba(50,185,200,0.3)] z-10 animate-[pulse_4s_ease-in-out_infinite]">
        404
      </div>

      {imageSrc && (
        <div className="flex justify-center -mt-6 z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <img
              alt="404"
              className="relative rounded-lg object-cover border border-brand-border grayscale group-hover:grayscale-0 transition-all duration-500"
              height={200}
              src={imageSrc}
              width={200}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}

      <h1 className="font-heading font-bold text-3xl tracking-tight sm:text-5xl text-brand-text z-10 mt-4">
        {title}
      </h1>

      <p className="font-mono text-brand-text-muted text-sm sm:text-base tracking-wide z-10 max-w-prose">{description}</p>

      <div className="flex justify-center mt-6 z-10">
        <Link to={href}>
          <Button>{cta}</Button>
        </Link>
      </div>
    </div>
  );
}
