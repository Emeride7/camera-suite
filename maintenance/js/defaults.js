export const defaultMaintenanceData = {
  cameras: [
    { id: 1, name: 'Camera 1', emplacement: 'Extérieur Gauche', etat: 'Bon', probleme: 'RAS', action: 'Nettoyage des objectifs' },
    { id: 2, name: 'Camera 2', emplacement: 'Piscine', etat: 'Bon', probleme: 'RAS', action: 'Réglage des angles de vue' },
    { id: 3, name: 'Camera 3', emplacement: 'Couloir Cuisine', etat: 'Bon', probleme: 'RAS', action: 'Mise à jour du firmware' },
    { id: 4, name: 'Camera 4', emplacement: 'Couloir Gauche', etat: 'Bon', probleme: 'RAS', action: '' },
    { id: 5, name: 'Camera 5', emplacement: 'Montée Escalier', etat: 'Bon', probleme: 'RAS', action: '' },
    { id: 6, name: 'Camera 6', emplacement: 'Hal R+1', etat: 'Bon', probleme: 'RAS', action: '' },
    { id: 7, name: 'Camera 7', emplacement: 'Couloir Piscine', etat: 'Bon', probleme: 'RAS', action: '' },
    { id: 8, name: 'Camera 8', emplacement: 'Jardin', etat: 'Pas Bon', probleme: "Camera court circuité à cause de l'eau de pluie", action: 'Remplacement des caméras' },
    { id: 9, name: 'Camera 9', emplacement: 'Parking', etat: 'Pas Bon', probleme: '', action: 'Remplacement des caméras' },
    { id: 10, name: 'Camera 10', emplacement: 'Extérieur Droit', etat: 'Pas Bon', probleme: '', action: 'Remplacement des caméras' },
    { id: 11, name: 'Camera 11', emplacement: 'Hall Rez', etat: 'Pas Bon', probleme: 'Connecteurs endommagés', action: 'Remplacement de connecteurs endommagés' }
  ],
  emplacements: [
    'Extérieur Gauche', 'Piscine', 'Couloir Cuisine', 'Couloir Gauche',
    'Montée Escalier', 'Hal R+1', 'Couloir Piscine', 'Jardin',
    'Parking', 'Extérieur Droit', 'Hall Rez'
  ],
  problemes: [
    'RAS', "Camera court circuité à cause de l'eau de pluie",
    'Connecteurs endommagés', 'Problème de connexion', 'Image floue'
  ],
  actions: [
    'Nettoyage des objectifs', 'Réglage des angles de vue',
    'Mise à jour du firmware', 'Remplacement des caméras',
    'Remplacement de connecteurs endommagés', 'Réparation urgente'
  ]
};
