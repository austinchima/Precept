"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [scale, setScale] = useState(1);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Calculate scale based on available space. 
        // Base required width for the new bigger wheel is around 800px.
        const minDimension = Math.min(width, height);
        // Base size is 650px. Add some padding.
        const newScale = Math.min(1.2, Math.max(0.5, minDimension / 750));
        setScale(newScale);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.2) % 360; // Slower rotation for larger wheel
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 280; // Increased radius for bigger wheel
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-brand-secondary bg-brand-primary border-brand-primary";
      case "in-progress":
        return "text-brand-text bg-brand-surface border-brand-border";
      case "pending":
        return "text-brand-text-muted bg-brand-surface/40 border-brand-border/50";
      default:
        return "text-brand-text-muted bg-brand-surface/40 border-brand-border/50";
    }
  };

  return (
    <div
      className="w-full h-full min-h-[700px] flex flex-col items-center justify-center bg-brand-secondary overflow-hidden relative"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-brand-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-primary) 1px, transparent 1px)', backgroundSize: '48px 48px' }}></div>
      <div className="relative w-full h-full flex items-center justify-center z-10 transition-transform duration-500 ease-in-out" style={{ transform: `scale(${scale})` }}>
        <div
          className="absolute w-full h-[800px] flex items-center justify-center transition-transform duration-500"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Core Pulsing Center */}
          <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary via-blue-500 to-teal-500 animate-pulse flex items-center justify-center z-10 shadow-[0_0_60px_rgba(50,185,200,0.6)]">
            <div className="absolute w-28 h-28 rounded-full border border-brand-primary/40 animate-ping opacity-70"></div>
            <div
              className="absolute w-36 h-36 rounded-full border border-brand-primary/20 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-12 h-12 rounded-full bg-brand-secondary/80 backdrop-blur-md flex items-center justify-center border border-brand-primary/50">
              <span className="material-symbols-outlined text-[20px] text-brand-primary">psychology</span>
            </div>
          </div>

          <div className="absolute w-[560px] h-[560px] rounded-full border border-brand-border/40 border-dashed animate-[spin_60s_linear_infinite] opacity-50"></div>
          <div className="absolute w-[420px] h-[420px] rounded-full border border-brand-primary/10"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(50,185,200,0.2) 0%, rgba(50,185,200,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-brand-primary text-brand-secondary"
                      : isRelated
                      ? "bg-brand-surface-high text-brand-primary"
                      : "bg-brand-surface text-brand-text"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-brand-primary shadow-lg shadow-brand-primary/30"
                      : isRelated
                      ? "border-brand-primary animate-pulse"
                      : "border-brand-border/40"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-150" : "hover:scale-110 hover:border-brand-primary/50"}
                `}
                >
                  <Icon size={16} />
                </div>

                <div
                  className={`
                  absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-xs font-mono tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-brand-primary font-bold scale-110" : "text-brand-text-muted"}
                `}
                >
                  {item.title}
                </div>

                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-brand-surface/90 backdrop-blur-xl border-brand-border shadow-2xl shadow-brand-primary/10 overflow-visible">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-brand-primary/50"></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge
                          variant={item.status === 'completed' ? 'default' : 'secondary'}
                          className={`px-2 text-[9px] ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "SOLID"
                            : item.status === "in-progress"
                            ? "SHAKY"
                            : "PANIC"}
                        </Badge>
                        <span className="text-[10px] font-mono text-brand-text-muted">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-brand-text">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-brand-text-muted">
                      <p className="font-sans leading-relaxed">{item.content}</p>

                      <div className="mt-4 pt-3 border-t border-brand-border">
                        <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-brand-text-muted mb-1">
                          <span className="flex items-center text-brand-primary">
                            <Zap size={10} className="mr-1" />
                            Confidence Level
                          </span>
                          <span>{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-brand-surface-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-brand-primary"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-brand-border">
                          <div className="flex items-center mb-2">
                            <Link size={10} className="text-brand-text-muted mr-1" />
                            <h4 className="text-[10px] uppercase tracking-widest font-mono text-brand-text-muted">
                              Connected Narratives
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-[10px] font-mono rounded-md border-brand-border bg-brand-surface hover:bg-brand-surface-high text-brand-text hover:text-brand-primary transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={8}
                                    className="ml-1 text-brand-text-muted"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
