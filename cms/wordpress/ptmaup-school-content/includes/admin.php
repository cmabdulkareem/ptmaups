<?php
/**
 * School Updates dashboard, list columns and photo checks.
 *
 * @package PTMAUP_School_Content
 */

if (!defined('ABSPATH')) {
    exit;
}

function ptmaup_sc_type_labels()
{
    return [
        'ptmaup_announcement' => __('Announcement', 'ptmaup-school-content'),
        'ptmaup_notice' => __('Notice', 'ptmaup-school-content'),
        'ptmaup_event' => __('Event', 'ptmaup-school-content'),
        'ptmaup_calendar' => __('Calendar entry', 'ptmaup-school-content'),
        'ptmaup_gallery' => __('Gallery collection', 'ptmaup-school-content'),
    ];
}

function ptmaup_sc_render_dashboard()
{
    if (!current_user_can('edit_posts')) {
        wp_die(esc_html__('You do not have permission to view this page.', 'ptmaup-school-content'));
    }

    $types = ptmaup_sc_type_labels();
    $flagged = [];
    $published_count = 0;

    foreach ($types as $type => $label) {
        $posts = get_posts([
            'post_type' => $type,
            'post_status' => 'publish',
            'posts_per_page' => 100,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => true,
        ]);
        $published_count += count($posts);
        foreach ($posts as $post) {
            $issues = ptmaup_sc_content_issues($post);
            if ($issues) {
                $flagged[] = [
                    'type' => $label,
                    'title' => ptmaup_sc_plain_title($post),
                    'link' => get_edit_post_link($post->ID),
                    'issues' => $issues,
                ];
            }
        }
    }

    $permalink_structure = get_option('permalink_structure');
    $endpoint = rest_url('ptmaup/v1/content');
    ?>
    <div class="wrap ptmaup-dashboard">
        <h1><?php esc_html_e('School Updates', 'ptmaup-school-content'); ?></h1>
        <p class="ptmaup-dashboard__lead">
            <?php esc_html_e('Use these screens to publish notices, events, calendar dates, announcements and photo galleries. The public website reads only published items and refreshes after each automated sync.', 'ptmaup-school-content'); ?>
        </p>

        <?php if ($permalink_structure === '') : ?>
            <div class="notice notice-warning inline">
                <p>
                    <strong><?php esc_html_e('Permalinks need attention.', 'ptmaup-school-content'); ?></strong>
                    <?php esc_html_e('The website sync expects the standard WordPress REST URL. Set Settings → Permalinks to “Post name”, then save.', 'ptmaup-school-content'); ?>
                </p>
            </div>
        <?php endif; ?>

        <div class="ptmaup-dashboard__grid">
            <section class="ptmaup-card">
                <h2><?php esc_html_e('Add to the website', 'ptmaup-school-content'); ?></h2>
                <p><?php esc_html_e('Published items are written for the public website. Drafts and unpublished items are not included.', 'ptmaup-school-content'); ?></p>
                <ul class="ptmaup-dashboard__links">
                    <li><a class="button button-primary" href="<?php echo esc_url(admin_url('post-new.php?post_type=ptmaup_notice')); ?>"><?php esc_html_e('Add notice', 'ptmaup-school-content'); ?></a></li>
                    <li><a class="button" href="<?php echo esc_url(admin_url('post-new.php?post_type=ptmaup_event')); ?>"><?php esc_html_e('Add event', 'ptmaup-school-content'); ?></a></li>
                    <li><a class="button" href="<?php echo esc_url(admin_url('post-new.php?post_type=ptmaup_calendar')); ?>"><?php esc_html_e('Add calendar entry', 'ptmaup-school-content'); ?></a></li>
                    <li><a class="button" href="<?php echo esc_url(admin_url('post-new.php?post_type=ptmaup_announcement')); ?>"><?php esc_html_e('Add announcement', 'ptmaup-school-content'); ?></a></li>
                    <li><a class="button" href="<?php echo esc_url(admin_url('post-new.php?post_type=ptmaup_gallery')); ?>"><?php esc_html_e('Add gallery collection', 'ptmaup-school-content'); ?></a></li>
                </ul>
            </section>

            <section class="ptmaup-card">
                <h2><?php esc_html_e('Before publishing', 'ptmaup-school-content'); ?></h2>
                <ol class="ptmaup-dashboard__checklist">
                    <li><?php esc_html_e('Use a confirmed date, category and title.', 'ptmaup-school-content'); ?></li>
                    <li><?php esc_html_e('Write a short excerpt and the full text for notices and events.', 'ptmaup-school-content'); ?></li>
                    <li><?php esc_html_e('For photographs, record consent, enter a consent reference and set Alternative Text of at least 8 characters.', 'ptmaup-school-content'); ?></li>
                    <li><?php esc_html_e('Check the “Website checks” column after saving. “Review” means an item needs attention or a photograph will be withheld.', 'ptmaup-school-content'); ?></li>
                </ol>
            </section>
        </div>

        <section class="ptmaup-card">
            <h2><?php esc_html_e('Website checks', 'ptmaup-school-content'); ?></h2>
            <p>
                <?php
                echo esc_html(sprintf(
                    _n('%d published item is available to the website.', '%d published items are available to the website.', $published_count, 'ptmaup-school-content'),
                    $published_count
                ));
                ?>
            </p>
            <?php if (!$flagged) : ?>
                <p><span class="ptmaup-badge ptmaup-badge--ok"><?php esc_html_e('All published items pass the checks.', 'ptmaup-school-content'); ?></span></p>
            <?php else : ?>
                <p><span class="ptmaup-badge ptmaup-badge--warning"><?php echo esc_html(sprintf(_n('%d published item needs review.', '%d published items need review.', count($flagged), 'ptmaup-school-content'), count($flagged))); ?></span></p>
                <ul class="ptmaup-dashboard__issues">
                    <?php foreach (array_slice($flagged, 0, 12) as $item) : ?>
                        <li>
                            <strong><?php echo esc_html($item['type']); ?>:</strong>
                            <?php if ($item['link']) : ?>
                                <a href="<?php echo esc_url($item['link']); ?>"><?php echo esc_html($item['title'] !== '' ? $item['title'] : __('Untitled', 'ptmaup-school-content')); ?></a>
                            <?php else : ?>
                                <?php echo esc_html($item['title']); ?>
                            <?php endif; ?>
                            <ul>
                                <?php foreach ($item['issues'] as $issue) : ?>
                                    <li><?php echo esc_html($issue); ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php if (count($flagged) > 12) : ?>
                    <p class="description"><?php esc_html_e('Only the first 12 items are listed here. Use the list screens to review the rest.', 'ptmaup-school-content'); ?></p>
                <?php endif; ?>
            <?php endif; ?>
        </section>

        <div class="ptmaup-dashboard__grid">
            <section class="ptmaup-card">
                <h2><?php esc_html_e('How the website updates', 'ptmaup-school-content'); ?></h2>
                <p><?php esc_html_e('The public website is a static site. An automated GitHub Actions job reads the published content from this WordPress site and rebuilds the pages, normally within an hour. Publishing here does not change the public pages immediately.', 'ptmaup-school-content'); ?></p>
                <p><strong><?php esc_html_e('Content endpoint', 'ptmaup-school-content'); ?></strong></p>
                <p><code class="ptmaup-endpoint"><?php echo esc_html($endpoint); ?></code></p>
                <p class="description"><?php esc_html_e('The endpoint is read-only and returns published content. Do not change its address.', 'ptmaup-school-content'); ?></p>
            </section>

            <section class="ptmaup-card">
                <h2><?php esc_html_e('Content and privacy', 'ptmaup-school-content'); ?></h2>
                <p><?php esc_html_e('The content endpoint and uploaded media are publicly readable so the static site can retrieve them without storing passwords. Publish only information and photographs approved for public display.', 'ptmaup-school-content'); ?></p>
                <p><?php esc_html_e('Photographs without recorded consent, a consent reference and suitable alternative text are withheld from the website. They may still exist in the WordPress media library, so do not upload confidential files at all.', 'ptmaup-school-content'); ?></p>
                <p><a href="<?php echo esc_url(admin_url('upload.php')); ?>"><?php esc_html_e('Open the media library', 'ptmaup-school-content'); ?></a></p>
            </section>
        </div>
    </div>
    <?php
}

function ptmaup_sc_entry_columns($columns)
{
    $updated = [];
    foreach ($columns as $key => $label) {
        $updated[$key] = $label;
        if ($key === 'title') {
            $updated['ptmaup_date'] = __('Website date', 'ptmaup-school-content');
            $updated['ptmaup_category'] = __('Category', 'ptmaup-school-content');
            $updated['ptmaup_review'] = __('Website checks', 'ptmaup-school-content');
        }
    }
    return $updated;
}

function ptmaup_sc_gallery_columns($columns)
{
    $updated = [];
    foreach ($columns as $key => $label) {
        $updated[$key] = $label;
        if ($key === 'title') {
            $updated['ptmaup_gallery_date'] = __('Date', 'ptmaup-school-content');
            $updated['ptmaup_photos'] = __('Photographs', 'ptmaup-school-content');
            $updated['ptmaup_review'] = __('Website checks', 'ptmaup-school-content');
        }
    }
    return $updated;
}

function ptmaup_sc_announcement_columns($columns)
{
    $updated = [];
    foreach ($columns as $key => $label) {
        $updated[$key] = $label;
        if ($key === 'title') {
            $updated['ptmaup_message'] = __('Message', 'ptmaup-school-content');
            $updated['ptmaup_review'] = __('Website checks', 'ptmaup-school-content');
        }
    }
    return $updated;
}

foreach (['ptmaup_notice', 'ptmaup_event', 'ptmaup_calendar'] as $ptmaup_type) {
    add_filter('manage_' . $ptmaup_type . '_posts_columns', 'ptmaup_sc_entry_columns');
    add_action('manage_' . $ptmaup_type . '_posts_custom_column', 'ptmaup_sc_render_entry_column', 10, 2);
}
add_filter('manage_ptmaup_gallery_posts_columns', 'ptmaup_sc_gallery_columns');
add_action('manage_ptmaup_gallery_posts_custom_column', 'ptmaup_sc_render_gallery_column', 10, 2);
add_filter('manage_ptmaup_announcement_posts_columns', 'ptmaup_sc_announcement_columns');
add_action('manage_ptmaup_announcement_posts_custom_column', 'ptmaup_sc_render_announcement_column', 10, 2);

function ptmaup_sc_review_badge($post_id)
{
    $post = get_post($post_id);
    if (!$post) {
        return;
    }
    $issues = ptmaup_sc_content_issues($post);
    if (!$issues) {
        echo '<span class="ptmaup-badge ptmaup-badge--ok">' . esc_html__('Ready', 'ptmaup-school-content') . '</span>';
        return;
    }
    echo '<span class="ptmaup-badge ptmaup-badge--warning" title="' . esc_attr(implode(' ', $issues)) . '">' . esc_html__('Review', 'ptmaup-school-content') . '</span>';
}

function ptmaup_sc_render_entry_column($column, $post_id)
{
    if ($column === 'ptmaup_review') {
        ptmaup_sc_review_badge($post_id);
        return;
    }
    if ($column === 'ptmaup_date') {
        $date = (string) get_post_meta($post_id, 'ptmaup_date', true);
        if (!ptmaup_sc_is_valid_date($date)) {
            echo '<span class="ptmaup-muted">' . esc_html__('Not set', 'ptmaup-school-content') . '</span>';
            return;
        }
        $formatted = date_i18n(get_option('date_format'), strtotime($date . ' 12:00:00'));
        echo esc_html($formatted);
        return;
    }
    if ($column === 'ptmaup_category') {
        $category = (string) get_post_meta($post_id, 'ptmaup_category', true);
        echo $category !== '' ? esc_html($category) : '<span class="ptmaup-muted">&mdash;</span>';
    }
}

function ptmaup_sc_render_gallery_column($column, $post_id)
{
    if ($column === 'ptmaup_review') {
        ptmaup_sc_review_badge($post_id);
        return;
    }
    if ($column === 'ptmaup_gallery_date') {
        $full_date = (string) get_post_meta($post_id, 'ptmaup_date_full', true);
        $year = (string) get_post_meta($post_id, 'ptmaup_year', true);
        if (ptmaup_sc_is_valid_date($full_date)) {
            echo esc_html(date_i18n(get_option('date_format'), strtotime($full_date . ' 12:00:00')));
        } elseif (ptmaup_sc_is_valid_year($year)) {
            echo esc_html($year);
        } else {
            echo '<span class="ptmaup-muted">' . esc_html__('Not set', 'ptmaup-school-content') . '</span>';
        }
        return;
    }
    if ($column === 'ptmaup_photos') {
        $ids = ptmaup_sc_get_photo_ids($post_id);
        $withheld = 0;
        foreach ($ids as $attachment_id) {
            if (ptmaup_sc_attachment_issues($attachment_id)) {
                $withheld += 1;
            }
        }
        echo esc_html(sprintf(
            _n('%d selected', '%d selected', count($ids), 'ptmaup-school-content'),
            count($ids)
        ));
        if ($withheld) {
            echo '<br><span class="ptmaup-badge ptmaup-badge--warning">' . esc_html(sprintf(
                _n('%d withheld', '%d withheld', $withheld, 'ptmaup-school-content'),
                $withheld
            )) . '</span>';
        }
    }
}

function ptmaup_sc_render_announcement_column($column, $post_id)
{
    if ($column === 'ptmaup_review') {
        ptmaup_sc_review_badge($post_id);
        return;
    }
    if ($column === 'ptmaup_message') {
        $message = trim((string) get_post_meta($post_id, 'ptmaup_message', true));
        if ($message === '') {
            echo '<span class="ptmaup-muted">' . esc_html__('Not set', 'ptmaup-school-content') . '</span>';
            return;
        }
        echo esc_html(wp_html_excerpt($message, 90, '…'));
    }
}

function ptmaup_sc_media_columns($columns)
{
    $updated = [];
    foreach ($columns as $key => $label) {
        $updated[$key] = $label;
        if ($key === 'title') {
            $updated['ptmaup_consent'] = __('Consent', 'ptmaup-school-content');
            $updated['ptmaup_alt'] = __('Alt text', 'ptmaup-school-content');
        }
    }
    return $updated;
}
add_filter('manage_media_columns', 'ptmaup_sc_media_columns');

function ptmaup_sc_media_custom_column($column, $post_id)
{
    if ($column === 'ptmaup_consent') {
        if (!wp_attachment_is_image($post_id)) {
            echo '<span class="ptmaup-muted">&mdash;</span>';
            return;
        }
        if (!ptmaup_sc_attachment_consent($post_id)) {
            echo '<span class="ptmaup-badge ptmaup-badge--warning">' . esc_html__('Not recorded', 'ptmaup-school-content') . '</span>';
            return;
        }
        if (ptmaup_sc_attachment_reference($post_id) === '') {
            echo '<span class="ptmaup-badge ptmaup-badge--warning">' . esc_html__('Reference missing', 'ptmaup-school-content') . '</span>';
            return;
        }
        echo '<span class="ptmaup-badge ptmaup-badge--ok">' . esc_html__('Recorded', 'ptmaup-school-content') . '</span>';
        return;
    }
    if ($column === 'ptmaup_alt') {
        if (!wp_attachment_is_image($post_id)) {
            echo '<span class="ptmaup-muted">&mdash;</span>';
            return;
        }
        if (ptmaup_sc_length(ptmaup_sc_attachment_alt($post_id)) < 8) {
            echo '<span class="ptmaup-badge ptmaup-badge--warning">' . esc_html__('Missing', 'ptmaup-school-content') . '</span>';
            return;
        }
        echo '<span class="ptmaup-badge ptmaup-badge--ok">' . esc_html__('Present', 'ptmaup-school-content') . '</span>';
    }
}
add_action('manage_media_custom_column', 'ptmaup_sc_media_custom_column', 10, 2);
