// Fine-mesh results transcribed from the supplied FEA report (pp. 6, 8, 11, 13).
// Values are rounded for the portfolio; source contours retain their original legends.
export const bladeMaterials = {
  cfrp: {
    label: "CFRP", description: "Equivalent isotropic composite",
    stress: [70.9, 63.4], deformation: [6.68, 3.24], frequency: [97.2, 147], mass: [0.8, 1.3],
    pages: [6, 11],
    note: "Higher frequency at lower reported mass than aluminium. Fibre direction and laminate stacking are not represented in this simplified isotropic model."
  },
  aluminium: {
    label: "Aluminium 2014 T4", description: "Metal material model",
    stress: [71.1, 63.9], deformation: [6.10, 2.96], frequency: [76.3, 115], mass: [1.8, 2.1],
    pages: [8, 13],
    note: "Slightly less deformation, but a lower first natural frequency and higher reported mass than CFRP. The final geometry was also assessed with the ANSYS fatigue tool."
  }
} as const;

export type BladeMaterial = keyof typeof bladeMaterials;
export type BladeResult = "stress" | "deformation";
