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
const {ThemeModel} = require("../model/theme/themeModel");

const listen = async function (worker) {
  /*
   * Find all themes
   *
   * @listens passbolt.themes.find-all
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.themes.find-all', async function (requestId) {
    try {
      const clientOptions = await User.getInstance().getApiClientOptions();
      const themeModel = new ThemeModel(clientOptions);
      const themes = await themeModel.findAll();
      worker.port.emit(requestId, 'SUCCESS', themes);
    } catch (error) {
      console.error(error);
      worker.port.emit(requestId, 'ERROR', error);
    }
  });
}

exports.listen = listen;
