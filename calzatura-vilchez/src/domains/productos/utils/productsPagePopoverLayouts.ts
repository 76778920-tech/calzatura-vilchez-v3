type PopoverStyle = { top: number; left: number; width: number };

export type CatalogPopoverViewport = { innerWidth: number; innerHeight: number };

function alignPopoverBelowTriggerCentered(
  rect: DOMRect,
  innerWidth: number,
  desiredWidth: number,
): PopoverStyle {
  const margin = 16;
  const topBelow = rect.bottom + 10;
  const maxLeft = Math.max(margin, innerWidth - desiredWidth - margin);
  const left = Math.max(margin, Math.min(rect.left - desiredWidth / 2 + rect.width / 2, maxLeft));
  return { top: topBelow, left, width: desiredWidth };
}

function alignPopoverBelowTriggerLeft(
  rect: DOMRect,
  innerWidth: number,
  desiredWidth: number,
): PopoverStyle {
  const margin = 16;
  const topBelow = rect.bottom + 10;
  const maxLeft = Math.max(margin, innerWidth - desiredWidth - margin);
  const left = Math.max(margin, Math.min(rect.left, maxLeft));
  return { top: topBelow, left, width: desiredWidth };
}

export function measurePriceCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(340, viewport.innerWidth - 32);
  return alignPopoverBelowTriggerLeft(rect, viewport.innerWidth, desiredWidth);
}

export function measureSizeCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(340, viewport.innerWidth - 32);
  return alignPopoverBelowTriggerLeft(rect, viewport.innerWidth, desiredWidth);
}

export function measureColorCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(600, viewport.innerWidth - 32);
  return alignPopoverBelowTriggerCentered(rect, viewport.innerWidth, desiredWidth);
}

export function measureMaterialCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(420, viewport.innerWidth - 32);
  return alignPopoverBelowTriggerCentered(rect, viewport.innerWidth, desiredWidth);
}

export function measureDiscountCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(360, viewport.innerWidth - 32);
  return alignPopoverBelowTriggerLeft(rect, viewport.innerWidth, desiredWidth);
}

export function measureMarcaCatalogPopover(rect: DOMRect, viewport: CatalogPopoverViewport): PopoverStyle {
  const desiredWidth = Math.min(260, viewport.innerWidth - 32);
  const margin = 16;
  const estimatedHeight = 172;
  const maxLeft = Math.max(margin, viewport.innerWidth - desiredWidth - margin);
  const left = Math.max(margin, Math.min(rect.left, maxLeft));
  const topBelow = rect.bottom + 10;
  const topAbove = rect.top - estimatedHeight - 10;
  const top =
    topBelow + estimatedHeight <= viewport.innerHeight - margin
      ? topBelow
      : Math.max(margin, topAbove);
  return { top, left, width: desiredWidth };
}
