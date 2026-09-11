---
title: "Forest CoverType Classification"
category: "Engineering Analysis"
year: "2025"
type: "Group project / individual analysis"
summary: "My section of an ecological modelling project: a Random Forest pipeline classifying seven forest cover types from terrain and environmental variables."
impact: "Balanced 581k+ source observations into seven comparable classes and achieved 88.6% validation accuracy across a 700-record evaluation set."
tags: ["Python", "Scikit-learn", "Random Forest", "Ecological Modelling", "Data Visualisation", "Model Evaluation"]
hero: "/images/projects/dataset-prediction/forest-tree.png"
---

My responsibility within the group report was forest CoverType classification. I cleaned the UCI Covertype data, removed continuous outliers beyond an absolute Z-score of three, simplified the feature space, balanced all seven classes to 500 samples each and used a stratified 80/20 train-validation split.

Exploratory analysis showed that no individual predictor had a strong linear relationship with CoverType: the largest absolute Pearson coefficient was 0.1307. I therefore selected a Random Forest classifier to capture non-linear thresholds and interactions between elevation, distances, slope and hillshade variables.

The model achieved 88.6% validation accuracy, with strong precision and recall for Types 3–7. Types 1 and 2 remained more difficult because of overlapping terrain ranges. The work also exposed an important limitation: undersampling made the classes comparable but reduced 581k observations to 3,500, motivating future comparison with class weighting, richer categorical encoding, cross-validation and a held-out test set.
