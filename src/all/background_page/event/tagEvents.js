/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 */
const {User} = require('../model/user');
const {TagModel} = require('../model/tag/tagModel');
const {TagEntity} = require('../model/entity/tag/tagEntity');
const {TagsCollection} = require('../model/entity/tag/tagsCollection');

const listen = function (worker) {
  /*
   * Find all the tags
   *
   * @listens passbolt.tags.find-all
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.tags.find-all', async function (requestId) {
    try {
      const apiOption = await User.getInstance().getApiClientOptions();
      const tagModel = new TagModel(apiOption);
      const tagsCollection = await tagModel.findAll();
      worker.port.emit(requestId, 'SUCCESS', tagsCollection);
    } catch (error) {
      worker.port.emit(requestId, 'ERROR', error);
    }
  });

  /*
   * Update resource tags
   *
   * @listens passbolt.tags.update-resource-tags
   * @param requestId {uuid} The request identifier
   * @param resourceId {uuid} The resource identifier
   * @param tagsDto {Object} tags dto
   */
  worker.port.on('passbolt.tags.update-resource-tags', async function (requestId, resourceId, tagsDto) {
    try {
      const apiOption = await User.getInstance().getApiClientOptions();
      const tagModel = new TagModel(apiOption);
      const tagsCollection = new TagsCollection(tagsDto);
      const tags = await tagModel.updateResourceTags(resourceId, tagsCollection);
      worker.port.emit(requestId, 'SUCCESS', tags);
    } catch (error) {
      worker.port.emit(requestId, 'ERROR', error);
    }
  });

  /*
   * Update a tag
   *
   * @listens passbolt.tags.update
   * @param requestId {uuid} The request identifier
   * @param tagDto {object} The tag object
   */
  worker.port.on('passbolt.tags.update', async function (requestId, tagDto) {
    try {
      const apiOption = await User.getInstance().getApiClientOptions();
      const tagModel = new TagModel(apiOption);
      const tagEntity = new TagEntity(tagDto);
      const updatedTag = await tagModel.update(tagEntity);
      worker.port.emit(requestId, 'SUCCESS', updatedTag);
    } catch (error) {
      worker.port.emit(requestId, 'ERROR', error);
    }
  });

  /*
   * Delete a tag
   *
   * @listens passbolt.tags.delete
   * @param requestId {uuid} The request identifier
   * @param tagId {uuid} The tag identifier
   */
  worker.port.on('passbolt.tags.delete', async function (requestId, tagId) {
    try {
      const apiOption = await User.getInstance().getApiClientOptions();
      const tagModel = new TagModel(apiOption);
      await tagModel.delete(tagId);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (error) {
      worker.port.emit(requestId, 'ERROR', error);
    }
  });
};
exports.listen = listen;
