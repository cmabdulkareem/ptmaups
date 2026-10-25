<?php
/**
 * Editor fields for school updates, gallery photographs and consent.
 *
 * @package PTMAUP_School_Content
 */

if (!defined('ABSPATH')) {
    exit;
}

function ptmaup_sc_add_meta_boxes()
{
    add_meta_box(
        'ptmaup_sc_notice_details',
        __('Notice details', 'ptmaup-school-content'),
        'ptmaup_sc_render_entry_details',
        'ptmaup_notice',
        'normal',
        'high',
        ['type' => 'ptmaup_notice']
    );
    add_meta_box(
        'ptmaup_sc_event_details',
        __('Event details', 'ptmaup-school-content'),
        'ptmaup_sc_render_entry_details',
        'ptmaup_event',
        'normal',
        'high',
        ['type' => 'ptmaup_event']
    );
    add_meta_box(
        'ptmaup_sc_calendar_details',
        __('Calendar details', 'ptmaup-school-content'),
        'ptmaup_sc_render_entry_details',
        'ptmaup_calendar',
        'normal',
        'high',
        ['type' => 'ptmaup_calendar']
    );
    add_meta_box(
        'ptmaup_sc_announcement_details',
        __('Announcement message', 'ptmaup-school-content'),
        'ptmaup_sc_render_announcement_details',
        'ptmaup_announcement',
        'normal',
        'high'
    );
    add_meta_box(
        'ptmaup_sc_gallery_details',
        __('Collection details', 'ptmaup-school-content'),
        'ptmaup_sc_render_gallery_details',
        'ptmaup_gallery',
        'normal',
        'high'
    );
    add_meta_box(
        'ptmaup_sc_gallery_photos',
        __('Photographs', 'ptmaup-school-content'),
        'ptmaup_sc_render_gallery_photos',
        'ptmaup_gallery',
        'normal',
        'high'
    );
    add_meta_box(
        'ptmaup_sc_attachment_consent',
        __('School photo consent', 'ptmaup-school-content'),
        'ptmaup_sc_render_attachment_consent',
        'attachment',
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'ptmaup_sc_add_meta_boxes');

function ptmaup_sc_render_entry_details($post, $box)
{
    $type = isset($box['args']['type']) ? $box['args']['type'] : '';
    $categories = ptmaup_sc_categories();
    $options = isset($categories[$type]) ? $categories[$type] : [];
    $date = (string) get_post_meta($post->ID, 'ptmaup_date', true);
    $category = (string) get_post_meta($post->ID, 'ptmaup_category', true);

    wp_nonce_field('ptmaup_sc_save_details', 'ptmaup_sc_details_nonce');
    ?>
    <div class="ptmaup-fields">
        <p class="ptmaup-field">
            <label for="ptmaup_date"><strong><?php esc_html_e('Date', 'ptmaup-school-content'); ?></strong></label>
            <input type="date" id="ptmaup_date" name="ptmaup_date" value="<?php echo esc_attr($date); ?>">
            <span class="description"><?php esc_html_e('The date shown on the website. Use the school event date, not the date you are writing this.', 'ptmaup-school-content'); ?></span>
        </p>
        <p class="ptmaup-field">
            <label for="ptmaup_category"><strong><?php esc_html_e('Category', 'ptmaup-school-content'); ?></strong></label>
            <select id="ptmaup_category" name="ptmaup_category">
                <option value=""><?php esc_html_e('Select a category', 'ptmaup-school-content'); ?></option>
                <?php foreach ($options as $option) : ?>
                    <option value="<?php echo esc_attr($option); ?>" <?php selected($category, $option); ?>>
                        <?php echo esc_html($option); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </p>
        <?php if ($type === 'ptmaup_calendar') : ?>
            <?php $description = (string) get_post_meta($post->ID, 'ptmaup_description', true); ?>
            <p class="ptmaup-field">
                <label for="ptmaup_description"><strong><?php esc_html_e('Short description', 'ptmaup-school-content'); ?></strong></label>
                <textarea id="ptmaup_description" name="ptmaup_description" rows="3" maxlength="500"><?php echo esc_textarea($description); ?></textarea>
                <span class="description"><?php esc_html_e('Optional. Keep it under 500 characters.', 'ptmaup-school-content'); ?></span>
            </p>
        <?php endif; ?>
    </div>
    <?php
}

function ptmaup_sc_render_announcement_details($post)
{
    $message = (string) get_post_meta($post->ID, 'ptmaup_message', true);

    wp_nonce_field('ptmaup_sc_save_details', 'ptmaup_sc_details_nonce');
    ?>
    <div class="ptmaup-fields">
        <p class="ptmaup-field">
            <label for="ptmaup_message"><strong><?php esc_html_e('Message', 'ptmaup-school-content'); ?></strong></label>
            <textarea id="ptmaup_message" name="ptmaup_message" rows="3" maxlength="240"><?php echo esc_textarea($message); ?></textarea>
            <span class="description"><?php esc_html_e('The message appears in the announcement bar on the public website. Keep it under 240 characters.', 'ptmaup-school-content'); ?></span>
        </p>
        <p class="description"><?php esc_html_e('Only the most recently published announcement is used. Leave this announcement as a draft or move it to Trash to hide the bar. The title is for your reference and is not shown on the website.', 'ptmaup-school-content'); ?></p>
    </div>
    <?php
}

function ptmaup_sc_render_gallery_details($post)
{
    $year = (string) get_post_meta($post->ID, 'ptmaup_year', true);
    $full_date = (string) get_post_meta($post->ID, 'ptmaup_date_full', true);
    $description = (string) get_post_meta($post->ID, 'ptmaup_description', true);
    $notes = get_post_meta($post->ID, 'ptmaup_notes', true);
    $notes_text = is_array($notes) ? implode("\n", $notes) : '';

    wp_nonce_field('ptmaup_sc_save_details', 'ptmaup_sc_details_nonce');
    ?>
    <div class="ptmaup-fields">
        <div class="ptmaup-fields__row">
            <p class="ptmaup-field">
                <label for="ptmaup_year"><strong><?php esc_html_e('Year', 'ptmaup-school-content'); ?></strong></label>
                <input type="number" id="ptmaup_year" name="ptmaup_year" min="1000" max="9999" step="1" value="<?php echo esc_attr($year); ?>">
                <span class="description"><?php esc_html_e('Required unless an exact date is supplied.', 'ptmaup-school-content'); ?></span>
            </p>
            <p class="ptmaup-field">
                <label for="ptmaup_date_full"><strong><?php esc_html_e('Exact date', 'ptmaup-school-content'); ?></strong></label>
                <input type="date" id="ptmaup_date_full" name="ptmaup_date_full" value="<?php echo esc_attr($full_date); ?>">
                <span class="description"><?php esc_html_e('Optional. Use this when the day is known.', 'ptmaup-school-content'); ?></span>
            </p>
        </div>
        <p class="ptmaup-field">
            <label for="ptmaup_gallery_description"><strong><?php esc_html_e('Short description', 'ptmaup-school-content'); ?></strong></label>
            <textarea id="ptmaup_gallery_description" name="ptmaup_description" rows="3" maxlength="600"><?php echo esc_textarea($description); ?></textarea>
            <span class="description"><?php esc_html_e('A sentence or two describing the collection. Keep it under 600 characters.', 'ptmaup-school-content'); ?></span>
        </p>
        <p class="ptmaup-field">
            <label for="ptmaup_notes"><strong><?php esc_html_e('Highlights', 'ptmaup-school-content'); ?></strong></label>
            <textarea id="ptmaup_notes" name="ptmaup_notes" rows="4" placeholder="<?php esc_attr_e('One short observation per line', 'ptmaup-school-content'); ?>"><?php echo esc_textarea($notes_text); ?></textarea>
            <span class="description"><?php esc_html_e('Optional. Up to four short lines, each under 240 characters.', 'ptmaup-school-content'); ?></span>
        </p>
    </div>
    <?php
}

function ptmaup_sc_render_gallery_photos($post)
{
    $photo_ids = ptmaup_sc_get_photo_ids($post->ID);

    wp_nonce_field('ptmaup_sc_save_photos', 'ptmaup_sc_photos_nonce');
    ?>
    <div class="ptmaup-photos">
        <input type="hidden" id="ptmaup-photo-ids" name="ptmaup_photo_ids" value="<?php echo esc_attr(implode(',', $photo_ids)); ?>">
        <p class="ptmaup-photos__actions">
            <button type="button" class="button button-primary" id="ptmaup-select-photos">
                <?php esc_html_e('Select photographs', 'ptmaup-school-content'); ?>
            </button>
            <button type="button" class="button" id="ptmaup-clear-photos">
                <?php esc_html_e('Clear selection', 'ptmaup-school-content'); ?>
            </button>
        </p>
        <p class="description">
            <?php esc_html_e('Drag selected photographs to set their order. A photograph appears on the website only when consent is recorded, a consent reference is entered, and alternative text of at least 8 characters is supplied.', 'ptmaup-school-content'); ?>
        </p>
        <ul class="ptmaup-photo-list" id="ptmaup-photo-list">
            <?php if (!$photo_ids) : ?>
                <li class="ptmaup-photo-empty"><?php esc_html_e('No photographs selected.', 'ptmaup-school-content'); ?></li>
            <?php endif; ?>
            <?php foreach ($photo_ids as $attachment_id) : ?>
                <?php
                $issues = ptmaup_sc_attachment_issues($attachment_id);
                $title = get_the_title($attachment_id);
                if ($title === '') {
                    $title = wp_basename((string) get_attached_file($attachment_id));
                }
                $edit_link = get_edit_post_link($attachment_id);
                ?>
                <li class="ptmaup-photo" data-id="<?php echo esc_attr($attachment_id); ?>">
                    <span class="ptmaup-photo-handle" aria-hidden="true">&#10303;</span>
                    <span class="ptmaup-photo-thumb">
                        <?php echo wp_get_attachment_image($attachment_id, 'thumbnail', false, ['alt' => '']); ?>
                    </span>
                    <span class="ptmaup-photo-info">
                        <strong><?php echo esc_html($title); ?></strong>
                        <?php if ($issues) : ?>
                            <?php foreach (ptmaup_sc_issue_labels($issues) as $label) : ?>
                                <span class="ptmaup-badge ptmaup-badge--warning"><?php echo esc_html($label); ?></span>
                            <?php endforeach; ?>
                        <?php else : ?>
                            <span class="ptmaup-badge ptmaup-badge--ok"><?php esc_html_e('Ready to publish', 'ptmaup-school-content'); ?></span>
                        <?php endif; ?>
                        <?php if ($edit_link) : ?>
                            <a class="ptmaup-photo-edit" href="<?php echo esc_url($edit_link); ?>" target="_blank" rel="noopener">
                                <?php esc_html_e('Edit photo details', 'ptmaup-school-content'); ?>
                            </a>
                        <?php endif; ?>
                    </span>
                    <button type="button" class="button-link ptmaup-photo-remove">
                        <?php esc_html_e('Remove', 'ptmaup-school-content'); ?>
                    </button>
                </li>
            <?php endforeach; ?>
        </ul>
        <p class="description"><?php esc_html_e('Save the gallery after adding photographs to refresh these checks.', 'ptmaup-school-content'); ?></p>
    </div>
    <?php
}

function ptmaup_sc_render_attachment_consent($post)
{
    if (get_post_type($post) !== 'attachment' || !wp_attachment_is_image($post->ID)) {
        echo '<p>' . esc_html__('Consent options are available for image attachments.', 'ptmaup-school-content') . '</p>';
        return;
    }

    $consent = ptmaup_sc_attachment_consent($post->ID);
    $reference = ptmaup_sc_attachment_reference($post->ID);
    $alt = ptmaup_sc_attachment_alt($post->ID);

    wp_nonce_field('ptmaup_sc_save_attachment', 'ptmaup_sc_attachment_nonce');
    ?>
    <div class="ptmaup-consent">
        <p>
            <label>
                <input type="checkbox" name="ptmaup_consent" value="1" <?php checked($consent, true); ?>>
                <?php esc_html_e('Consent recorded for website publication', 'ptmaup-school-content'); ?>
            </label>
        </p>
        <p>
            <label for="ptmaup_consent_reference"><strong><?php esc_html_e('Consent reference', 'ptmaup-school-content'); ?></strong></label>
            <input type="text" id="ptmaup_consent_reference" name="ptmaup_consent_reference" class="widefat" maxlength="200" value="<?php echo esc_attr($reference); ?>">
        </p>
        <p class="description"><?php esc_html_e('Record who gave consent and when, or the consent form reference. This note is stored in WordPress but is not published on the website.', 'ptmaup-school-content'); ?></p>
        <p class="ptmaup-consent__status">
            <strong><?php esc_html_e('Alternative text', 'ptmaup-school-content'); ?>:</strong>
            <?php if (ptmaup_sc_length($alt) >= 8) : ?>
                <span class="ptmaup-badge ptmaup-badge--ok"><?php esc_html_e('Present', 'ptmaup-school-content'); ?></span>
            <?php else : ?>
                <span class="ptmaup-badge ptmaup-badge--warning"><?php esc_html_e('Missing or too short', 'ptmaup-school-content'); ?></span>
                <span class="description"><?php esc_html_e('Set the Alternative Text field in the attachment details.', 'ptmaup-school-content'); ?></span>
            <?php endif; ?>
        </p>
    </div>
    <?php
}

function ptmaup_sc_save_entry_details($post_id, $post_type)
{
    if (
        !isset($_POST['ptmaup_sc_details_nonce'])
        || !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST['ptmaup_sc_details_nonce'])),
            'ptmaup_sc_save_details'
        )
    ) {
        return;
    }
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id)) {
        return;
    }
    if (get_post_type($post_id) !== $post_type || !current_user_can('edit_post', $post_id)) {
        return;
    }

    $date = isset($_POST['ptmaup_date'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_date']))
        : '';
    if (ptmaup_sc_is_valid_date($date)) {
        update_post_meta($post_id, 'ptmaup_date', $date);
    } else {
        delete_post_meta($post_id, 'ptmaup_date');
    }

    $category = isset($_POST['ptmaup_category'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_category']))
        : '';
    if (ptmaup_sc_allowed_category($post_type, $category)) {
        update_post_meta($post_id, 'ptmaup_category', $category);
    } else {
        delete_post_meta($post_id, 'ptmaup_category');
    }

    if ($post_type === 'ptmaup_calendar') {
        $description = isset($_POST['ptmaup_description'])
            ? sanitize_textarea_field(wp_unslash($_POST['ptmaup_description']))
            : '';
        $description = trim($description);
        if ($description !== '') {
            update_post_meta($post_id, 'ptmaup_description', $description);
        } else {
            delete_post_meta($post_id, 'ptmaup_description');
        }
    }
}

function ptmaup_sc_save_notice($post_id)
{
    ptmaup_sc_save_entry_details($post_id, 'ptmaup_notice');
}
add_action('save_post_ptmaup_notice', 'ptmaup_sc_save_notice');

function ptmaup_sc_save_event($post_id)
{
    ptmaup_sc_save_entry_details($post_id, 'ptmaup_event');
}
add_action('save_post_ptmaup_event', 'ptmaup_sc_save_event');

function ptmaup_sc_save_calendar($post_id)
{
    ptmaup_sc_save_entry_details($post_id, 'ptmaup_calendar');
}
add_action('save_post_ptmaup_calendar', 'ptmaup_sc_save_calendar');

function ptmaup_sc_save_announcement($post_id)
{
    if (
        !isset($_POST['ptmaup_sc_details_nonce'])
        || !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST['ptmaup_sc_details_nonce'])),
            'ptmaup_sc_save_details'
        )
    ) {
        return;
    }
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id)) {
        return;
    }
    if (get_post_type($post_id) !== 'ptmaup_announcement' || !current_user_can('edit_post', $post_id)) {
        return;
    }

    $message = isset($_POST['ptmaup_message'])
        ? sanitize_textarea_field(wp_unslash($_POST['ptmaup_message']))
        : '';
    $message = trim($message);
    if ($message !== '') {
        update_post_meta($post_id, 'ptmaup_message', $message);
    } else {
        delete_post_meta($post_id, 'ptmaup_message');
    }
}
add_action('save_post_ptmaup_announcement', 'ptmaup_sc_save_announcement');

function ptmaup_sc_save_gallery_details($post_id)
{
    if (
        !isset($_POST['ptmaup_sc_details_nonce'])
        || !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST['ptmaup_sc_details_nonce'])),
            'ptmaup_sc_save_details'
        )
    ) {
        return;
    }
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id)) {
        return;
    }
    if (get_post_type($post_id) !== 'ptmaup_gallery' || !current_user_can('edit_post', $post_id)) {
        return;
    }

    $year = isset($_POST['ptmaup_year'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_year']))
        : '';
    $full_date = isset($_POST['ptmaup_date_full'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_date_full']))
        : '';

    if (!ptmaup_sc_is_valid_year($year) && ptmaup_sc_is_valid_date($full_date)) {
        $year = substr($full_date, 0, 4);
    }
    if (ptmaup_sc_is_valid_year($year)) {
        update_post_meta($post_id, 'ptmaup_year', $year);
    } else {
        delete_post_meta($post_id, 'ptmaup_year');
    }
    if (ptmaup_sc_is_valid_date($full_date)) {
        update_post_meta($post_id, 'ptmaup_date_full', $full_date);
    } else {
        delete_post_meta($post_id, 'ptmaup_date_full');
    }

    $description = isset($_POST['ptmaup_description'])
        ? sanitize_textarea_field(wp_unslash($_POST['ptmaup_description']))
        : '';
    $description = trim($description);
    if ($description !== '') {
        update_post_meta($post_id, 'ptmaup_description', $description);
    } else {
        delete_post_meta($post_id, 'ptmaup_description');
    }

    $notes_raw = isset($_POST['ptmaup_notes'])
        ? sanitize_textarea_field(wp_unslash($_POST['ptmaup_notes']))
        : '';
    $notes = [];
    foreach (preg_split('/\r\n|\r|\n/', $notes_raw) as $line) {
        $line = trim($line);
        if ($line !== '') {
            $notes[] = $line;
        }
    }
    if ($notes) {
        update_post_meta($post_id, 'ptmaup_notes', $notes);
    } else {
        delete_post_meta($post_id, 'ptmaup_notes');
    }
}
add_action('save_post_ptmaup_gallery', 'ptmaup_sc_save_gallery_details');

function ptmaup_sc_save_gallery_photos($post_id)
{
    if (
        !isset($_POST['ptmaup_sc_photos_nonce'])
        || !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST['ptmaup_sc_photos_nonce'])),
            'ptmaup_sc_save_photos'
        )
    ) {
        return;
    }
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id)) {
        return;
    }
    if (get_post_type($post_id) !== 'ptmaup_gallery' || !current_user_can('edit_post', $post_id)) {
        return;
    }

    $raw = isset($_POST['ptmaup_photo_ids'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_photo_ids']))
        : '';
    $ids = [];
    foreach (explode(',', $raw) as $candidate) {
        $id = absint($candidate);
        if ($id && !in_array($id, $ids, true) && wp_attachment_is_image($id)) {
            $ids[] = $id;
        }
    }
    if ($ids) {
        update_post_meta($post_id, 'ptmaup_photo_ids', $ids);
    } else {
        delete_post_meta($post_id, 'ptmaup_photo_ids');
    }
}
add_action('save_post_ptmaup_gallery', 'ptmaup_sc_save_gallery_photos');

function ptmaup_sc_save_attachment_consent($post_id)
{
    if (
        !isset($_POST['ptmaup_sc_attachment_nonce'])
        || !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST['ptmaup_sc_attachment_nonce'])),
            'ptmaup_sc_save_attachment'
        )
    ) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    if (!empty($_POST['ptmaup_consent'])) {
        update_post_meta($post_id, 'ptmaup_consent', '1');
    } else {
        delete_post_meta($post_id, 'ptmaup_consent');
    }

    $reference = isset($_POST['ptmaup_consent_reference'])
        ? sanitize_text_field(wp_unslash($_POST['ptmaup_consent_reference']))
        : '';
    if ($reference !== '') {
        update_post_meta($post_id, 'ptmaup_consent_reference', $reference);
    } else {
        delete_post_meta($post_id, 'ptmaup_consent_reference');
    }
}
add_action('edit_attachment', 'ptmaup_sc_save_attachment_consent');

function ptmaup_sc_attachment_fields($form_fields, $post)
{
    if (!wp_attachment_is_image($post->ID)) {
        return $form_fields;
    }

    $consent = ptmaup_sc_attachment_consent($post->ID);
    $reference = ptmaup_sc_attachment_reference($post->ID);
    $alt = ptmaup_sc_attachment_alt($post->ID);

    $form_fields['ptmaup_consent'] = [
        'label' => __('School consent', 'ptmaup-school-content'),
        'input' => 'html',
        'html' => '<label><input type="checkbox" name="attachments[' . esc_attr($post->ID) . '][ptmaup_consent]" value="1" ' . checked($consent, true, false) . '> ' . esc_html__('Consent recorded for website publication', 'ptmaup-school-content') . '</label>',
        'helps' => __('A photograph will not appear on the website without recorded consent, a consent reference and alternative text.', 'ptmaup-school-content'),
    ];
    $form_fields['ptmaup_consent_reference'] = [
        'label' => __('Consent reference', 'ptmaup-school-content'),
        'input' => 'text',
        'value' => $reference,
        'helps' => __('Who gave consent and when, or the consent form reference. This is not published.', 'ptmaup-school-content'),
    ];
    $form_fields['ptmaup_alt_status'] = [
        'label' => __('Alternative text', 'ptmaup-school-content'),
        'input' => 'html',
        'html' => ptmaup_sc_length($alt) >= 8
            ? '<span class="ptmaup-badge ptmaup-badge--ok">' . esc_html__('Present', 'ptmaup-school-content') . '</span>'
            : '<span class="ptmaup-badge ptmaup-badge--warning">' . esc_html__('Missing or too short', 'ptmaup-school-content') . '</span>',
        'helps' => __('Set the Alternative Text field above before publishing the photograph.', 'ptmaup-school-content'),
    ];

    return $form_fields;
}
add_filter('attachment_fields_to_edit', 'ptmaup_sc_attachment_fields', 10, 2);

function ptmaup_sc_save_attachment_fields($post, $attachment)
{
    if (empty($post['ID']) || !current_user_can('edit_post', $post['ID'])) {
        return $post;
    }
    if (!wp_attachment_is_image($post['ID'])) {
        return $post;
    }
    if (!array_key_exists('ptmaup_consent', $attachment) && !array_key_exists('ptmaup_consent_reference', $attachment)) {
        return $post;
    }

    if (!empty($attachment['ptmaup_consent'])) {
        update_post_meta($post['ID'], 'ptmaup_consent', '1');
    } else {
        delete_post_meta($post['ID'], 'ptmaup_consent');
    }

    $reference = isset($attachment['ptmaup_consent_reference'])
        ? sanitize_text_field($attachment['ptmaup_consent_reference'])
        : '';
    if ($reference !== '') {
        update_post_meta($post['ID'], 'ptmaup_consent_reference', $reference);
    } else {
        delete_post_meta($post['ID'], 'ptmaup_consent_reference');
    }

    return $post;
}
add_filter('attachment_fields_to_save', 'ptmaup_sc_save_attachment_fields', 10, 2);

function ptmaup_sc_prepare_attachment_for_js($response, $attachment, $meta)
{
    $response['ptmaupConsent'] = ptmaup_sc_attachment_consent($attachment->ID);
    $response['ptmaupConsentReference'] = ptmaup_sc_attachment_reference($attachment->ID);
    $response['editLink'] = get_edit_post_link($attachment->ID, 'raw');
    return $response;
}
add_filter('wp_prepare_attachment_for_js', 'ptmaup_sc_prepare_attachment_for_js', 10, 3);

function ptmaup_sc_admin_assets($hook)
{
    $screen = get_current_screen();
    $is_plugin_screen = $screen && (
        strpos((string) $screen->id, 'ptmaup') !== false
        || $screen->post_type === 'attachment'
        || $screen->id === 'media'
        || $screen->id === 'upload'
    );
    if (!$is_plugin_screen) {
        return;
    }

    wp_enqueue_style(
        'ptmaup-sc-admin',
        PTMAUP_SC_URL . 'assets/admin.css',
        [],
        PTMAUP_SC_VERSION
    );

    if (!$screen || $screen->post_type !== 'ptmaup_gallery' || !in_array($hook, ['post.php', 'post-new.php'], true)) {
        return;
    }

    wp_enqueue_media();
    wp_enqueue_script(
        'ptmaup-sc-admin',
        PTMAUP_SC_URL . 'assets/admin.js',
        ['jquery', 'jquery-ui-sortable'],
        PTMAUP_SC_VERSION,
        true
    );
    wp_localize_script('ptmaup-sc-admin', 'ptmaupScAdmin', [
        'frameTitle' => __('Select photographs', 'ptmaup-school-content'),
        'frameButton' => __('Use these photographs', 'ptmaup-school-content'),
        'emptyLabel' => __('No photographs selected.', 'ptmaup-school-content'),
        'removeLabel' => __('Remove', 'ptmaup-school-content'),
        'editLabel' => __('Edit photo details', 'ptmaup-school-content'),
        'readyLabel' => __('Ready to publish', 'ptmaup-school-content'),
        'missingAlt' => __('Alternative text is missing or too short.', 'ptmaup-school-content'),
        'missingConsent' => __('Consent is not recorded.', 'ptmaup-school-content'),
        'missingReference' => __('The consent reference is missing.', 'ptmaup-school-content'),
        'reviewNote' => __('Save the gallery to refresh consent and alternative-text checks.', 'ptmaup-school-content'),
        'confirmClear' => __('Remove all selected photographs from this gallery?', 'ptmaup-school-content'),
    ]);
}
add_action('admin_enqueue_scripts', 'ptmaup_sc_admin_assets');
