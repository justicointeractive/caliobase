export const AllRoles = [
  ...(['owner', 'manager', 'writer', 'moderator', 'guest'] as const),
];

export type Role = typeof AllRoles[number];

export const Roles = {
  AllRoles,
  fromMiniumLevel(minLevel: Role) {
    const allowedLevels = AllRoles.slice(0, AllRoles.indexOf(minLevel) + 1);
    return allowedLevels;
  },
  fromMaxLevel(maxLevel: Role) {
    const allowedLevels = AllRoles.slice(AllRoles.indexOf(maxLevel));
    return allowedLevels;
  },
};

export type EntityActions = 'create' | 'get' | 'list' | 'update' | 'delete';
