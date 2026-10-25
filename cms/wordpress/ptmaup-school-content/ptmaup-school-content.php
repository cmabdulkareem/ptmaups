<?php
/**
 * Plugin Name:       PTMAUP School Content
 * Description:       Manages school announcements, notices, events, calendar entries and photo galleries for the static school website.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            PTMAUP School
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ptmaup-school-content
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PTMAUP_SC_VERSION', '1.0.0');
define('PTMAUP_SC_FILE', __FILE__);
define('PTMAUP_SC_DIR', plugin_dir_path(__FILE__));
define('PTMAUP_SC_URL', plugin_dir_url(__FILE__));

require_once PTMAUP_SC_DIR . 'includes/helpers.php';
require_once PTMAUP_SC_DIR . 'includes/post-types.php';
require_once PTMAUP_SC_DIR . 'includes/meta-boxes.php';
require_once PTMAUP_SC_DIR . 'includes/rest.php';
require_once PTMAUP_SC_DIR . 'includes/admin.php';
