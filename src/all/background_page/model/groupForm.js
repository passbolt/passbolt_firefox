/**
 * GroupForm model.
 *
 * Helper for creating / updating groups.
 * Provides tools to manage group users and keep track of changes.
 *
 * @copyright (c) 2017-present Passbolt SARL.
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */

var Config = require('./config');
var UserSettings = require('./userSettings/userSettings').UserSettings;
var Group = require('./group').Group;
var TabStorage = require('../model/tabStorage').TabStorage;
var jsonQ = require('../sdk/jsonQ').jsonQ;

/**
 * The class that deals with groups.
 */
var GroupForm = function (tabId) {
    // see model/settings
    this.settings = new UserSettings();

    // Store tabId.
    this.tabId = tabId;

    /**
     * Definition of group object.
     *
     * @type {{user: {}, key: {}, settings: {}}}
     * @private
     */
    this._groupForm = {
        state: 'create',
        initialGroup: {}, // Group model.
        currentGroup: {}  // Group model.
    };
};

/**
 * Initialize a groupForm model..
 * @param state
 * @param group
 */
GroupForm.prototype.init = function(state, group) {
    if (typeof group === 'undefined') {
        group = {
            Group: {
                id: '',
                name: '',
            },
            GroupUser: []
        };
    }
    var groupForm = this._groupForm;
    groupForm.state = state;
    groupForm.initialGroup = group;
    groupForm.currentGroup = _.clone(groupForm.initialGroup);
    // Clone GroupUser array.
    groupForm.currentGroup.GroupUser = groupForm.initialGroup.GroupUser.slice(0);

    // Set groupForm in tab storage.
    TabStorage.set(this.tabId, 'groupForm', groupForm);
};

/**
 * Check if the form is creating a group.
 * @return {bool} Tru if creating, false otherwise.
 */
GroupForm.prototype.isCreating = function() {
  const currentGroup = this.get().currentGroup;

  return currentGroup.Group.id == undefined || currentGroup.Group.id == '';
};

/**
 * Check if new user have been added to the group.
 * @return {bool}
 */
GroupForm.prototype.hasNewUsers = function() {
  const groupUserChangeList = this.getGroupUsersChangeList();

  return groupUserChangeList.find(change => change.status == 'created') != undefined;;
};

/**
 * Retrieve a groupForm.
 *
 * @param key
 *   key element to retrieve (in the form xxx.xxx)
 *   if not provided, will return the whole groupForm object.
 * @returns {object}
 *   groupForm object
 */
GroupForm.prototype.get = function(key) {
    var groupForm = TabStorage.get(this.tabId, 'groupForm');
    if (typeof key !== 'undefined') {
        key = key.split(".");
        var val = jsonQ.pathValue(groupForm, key);
        if (typeof val === 'undefined') {
            return '';
        }
        return val;
    }

    return groupForm;
};

/**
 * Set a groupForm key value.
 * @param key
 * @param value
 * @returns {*}
 */
GroupForm.prototype.set = function (key, value) {
    // Get groupForm stored.
    var groupForm = TabStorage.get(this.tabId, 'groupForm');
    key = key.split(".");
    jsonQ.setPathValue(groupForm, key, value);
    TabStorage.set(this.tabId, 'groupForm', groupForm);
    return groupForm;
};

/**
 * Add a group user in the group.
 *
 * @param groupId
 * @returns {*}
 */
GroupForm.prototype.addGroupUser = function(user) {
    var _this = this,
      _groupForm = this.get();

    return new Promise( function(resolve) {
      var groupUsers = _groupForm.currentGroup.GroupUser;

      // Check if there is already one admin.
      var adminExisting = false;
      for (var i in groupUsers) {
        if (groupUsers[i].is_admin == 1) {
          adminExisting = true;
        }
      }

      // Build groupUser object.
      var groupUser = {
        user_id: user.User.id,
        is_admin: adminExisting == true ? 0 : 1,
        User: user
      };

      // Add object to groupUsers list in tab storage.
      groupUsers.push(groupUser);
      _this.set('currentGroup.GroupUser', groupUsers);
      resolve(groupUser, _this.getGroupUsersChangeList());
    });
};

/**
 * remove a group user from the group.
 *
 * @param groupUser
 * @returns {*}
 */
GroupForm.prototype.deleteGroupUser = function(groupUserToDelete) {
    var _this = this,
      _groupForm = this.get(),
      groupUsers = _groupForm.currentGroup.GroupUser;

    return new Promise( function(resolve, reject) {
      // Check if there is already one admin, and getthe index
      // of the groupUser we are looking for.
      var adminCount = 0;
      var index = null;
      for (var i in groupUsers) {
        if (groupUsers[i].is_admin == true) {
          adminCount++;
        }
        if (groupUsers[i].user_id == groupUserToDelete.user_id) {
          index = i;
        }
      }

      // If we are trying to delete the last group admin, throw an exception.
      if (groupUserToDelete.is_admin == true && adminCount <= 1) {
        reject('Can not delete last group admin');
      } else {
          // remove groupUser from array.
          groupUsers.splice(index, 1);
          _this.set('currentGroup.GroupUser', groupUsers);
          resolve(groupUserToDelete);
      }
    });
};

/**
 * update a group user in the group.
 *
 * @param groupUser
 * @returns {*}
 */
GroupForm.prototype.updateGroupUser = function(groupUserToUpdate) {
    var _this = this,
      _groupForm = this.get(),
      groupUsers = _groupForm.currentGroup.GroupUser;

    return new Promise( function(resolve, reject) {
      // Check if there is already one admin, and getthe index
      // of the groupUser we are looking for.
      var adminCount = 0;
      var index = null;
      for (var i in groupUsers) {
        if (groupUsers[i].is_admin == 1 || groupUsers[i].is_admin == true) {
          adminCount++;
        }
        if (groupUsers[i].user_id == groupUserToUpdate.user_id) {
          index = i;
        }
      }

      // If we are trying to delete the last group admin, throw an exception.
      var isRemoveAdmin = groupUserToUpdate.is_admin == false && groupUsers[index].is_admin == true;
      if (isRemoveAdmin && adminCount <= 1) {
        reject('Can not delete last group admin');
      } else {
          // remove groupUser from array.
          groupUsers[index] = _.clone(groupUsers[index]);
          groupUsers[index].is_admin = groupUserToUpdate.is_admin;

          _this.set('currentGroup.GroupUser', groupUsers);
          resolve(groupUsers[index]);
      }
    });
}

/**
 * Get change list in groupUsers in the form.
 *
 * Obtain the change list by comparing currentGroupUsers and initialGroupUsers.
 *
 * @returns {Array}
 */
GroupForm.prototype.getGroupUsersChangeList = function() {
    var _groupForm = this.get();
    var initialGroupUsers = _groupForm.initialGroup.GroupUser;
    var currentGroupUsers = _groupForm.currentGroup.GroupUser;

    var changeList = [];

    // Search for created and updated group users.
    // We browse the current group users and compare with the initial ones.
    for (var i in currentGroupUsers) {
        var existingGroupUser = Group.checkGroupUserUserIdExists(_groupForm.initialGroup, currentGroupUsers[i].user_id);
        if (existingGroupUser != false) {
            // Check if it has been created or updated.
            if (existingGroupUser.is_admin != currentGroupUsers[i].is_admin) {
                var groupUser = _.clone(currentGroupUsers[i]);
                groupUser.status = 'updated';
                changeList.push(groupUser);
            }
        }
        else {
            var groupUser = _.clone(currentGroupUsers[i]);
            groupUser.status = 'created';
            changeList.push(groupUser);
        }
    }

    // Search for deleted group users.
    // We browse the initial group users and compare with the current ones.
    for (var i in initialGroupUsers) {
        var existingGroupUser = Group.checkGroupUserUserIdExists(_groupForm.currentGroup, initialGroupUsers[i].user_id);
        if (existingGroupUser == false) {
            var groupUser = _.clone(initialGroupUsers[i]);
            groupUser.status = 'deleted';
            changeList.push(groupUser);
        }
    }

    return changeList;
};

/**
 * Get post json representation of a group for a save operation.
 * @returns Object {{Group: {name: *}, GroupUsers: Array}}
 */
GroupForm.prototype.getPostJson = function() {
    var group = this.get('currentGroup'),
        initialGroup = this.get('initialGroup'),
        changes = this.getGroupUsersChangeList();

    var groupJson = {
        "Group" : {
            name: group.Group.name,
        },
        "GroupUsers": []
    };

    for (var i in changes) {
        var groupUser = null;
        switch(changes[i].status) {
            case 'created':
                groupUser = {
                    user_id : changes[i].user_id,
                    is_admin: changes[i].is_admin,
                };
                break;
            case 'updated':
                groupUser = {
                    id : changes[i].id,
                    is_admin: changes[i].is_admin,
                };
                break;
            case 'deleted':
                groupUser = {
                    id : changes[i].id,
                    delete: '1',
                };
                break;
        }
        if (groupUser != null) {
            groupJson.GroupUsers.push({GroupUser: groupUser});
        }
    }
    return groupJson;
};


// Exports the Group object.
exports.GroupForm = GroupForm;
