<?php
/**
 * Read-only content endpoint consumed by the static site build.
 *
 * @package PTMAUP_School_Content
 */

if (!defined('ABSPATH')) {
    exit;
}

function ptmaup_sc_register_rest_route()
{
    register_rest_route('ptmaup/v1', '/content', [
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'ptmaup_sc_rest_content',
        'permission_callback' => '__return_true',
    ]);
}
add_action('rest_api_init', 'ptmaup_sc_register_rest_route');

function ptmaup_sc_rest_content()
{
    nocache_headers();

    $data = [
        'schema' => 1,
        'pluginVersion' => PTMAUP_SC_VERSION,
        'generatedAt' => gmdate('c'),
        'announcement' => ptmaup_sc_rest_announcement(),
        'notices' => ptmaup_sc_rest_entries('ptmaup_notice'),
        'events' => ptmaup_sc_rest_entries('ptmaup_event'),
        'calendar' => ptmaup_sc_rest_calendar(),
        'galleries' => ptmaup_sc_rest_galleries(),
    ];

    $response = new WP_REST_Response($data, 200);
    $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    $response->header('X-Robots-Tag', 'noindex, nofollow');
    return $response;
}

function ptmaup_sc_rest_posts($post_type, $limit)
{
    return get_posts([
        'post_type' => $post_type,
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'orderby' => 'date',
        'order' => 'DESC',
        'no_found_rows' => true,
        'has_password' => false,
        'suppress_filters' => false,
    ]);
}

function ptmaup_sc_rest_announcement()
{
    $posts = ptmaup_sc_rest_posts('ptmaup_announcement', 20);
    foreach ($posts as $post) {
        $message = trim((string) get_post_meta($post->ID, 'ptmaup_message', true));
        if ($message === '') {
            continue;
        }
        $message = trim(preg_replace('/\s+/', ' ', $message));
        return [
            'message' => $message,
            'updated' => get_post_modified_time('Y-m-d', false, $post),
        ];
    }
    return null;
}

function ptmaup_sc_rest_entries($post_type)
{
    $limits = [
        'ptmaup_notice' => 101,
        'ptmaup_event' => 201,
    ];
    $limit = isset($limits[$post_type]) ? $limits[$post_type] : 201;
    $entries = [];

    foreach (ptmaup_sc_rest_posts($post_type, $limit) as $post) {
        $entries[] = [
            'id' => ptmaup_sc_post_id($post),
            'date' => (string) get_post_meta($post->ID, 'ptmaup_date', true),
            'category' => (string) get_post_meta($post->ID, 'ptmaup_category', true),
            'title' => ptmaup_sc_plain_title($post),
            'excerpt' => ptmaup_sc_truncate(ptmaup_sc_excerpt_source($post), 320),
            'body' => ptmaup_sc_paragraphs($post->post_content),
        ];
    }

    return $entries;
}

function ptmaup_sc_rest_calendar()
{
    $entries = [];
    foreach (ptmaup_sc_rest_posts('ptmaup_calendar', 501) as $post) {
        $entries[] = [
            'id' => ptmaup_sc_post_id($post),
            'date' => (string) get_post_meta($post->ID, 'ptmaup_date', true),
            'category' => (string) get_post_meta($post->ID, 'ptmaup_category', true),
            'title' => ptmaup_sc_plain_title($post),
            'description' => trim((string) get_post_meta($post->ID, 'ptmaup_description', true)),
        ];
    }
    return $entries;
}

function ptmaup_sc_rest_galleries()
{
    $galleries = [];

    foreach (ptmaup_sc_rest_posts('ptmaup_gallery', 101) as $post) {
        $year = (string) get_post_meta($post->ID, 'ptmaup_year', true);
        $full_date = (string) get_post_meta($post->ID, 'ptmaup_date_full', true);

        if (!ptmaup_sc_is_valid_date($full_date)) {
            $full_date = '';
        }
        if (!ptmaup_sc_is_valid_year($year) && $full_date !== '') {
            $year = substr($full_date, 0, 4);
        }
        if (!ptmaup_sc_is_valid_year($year)) {
            $year = '';
        }

        $notes = get_post_meta($post->ID, 'ptmaup_notes', true);
        $clean_notes = [];
        if (is_array($notes)) {
            foreach ($notes as $note) {
                $note = trim(wp_strip_all_tags((string) $note));
                if ($note !== '') {
                    $clean_notes[] = $note;
                }
            }
        }

        $photos = [];
        $withheld = 0;
        foreach (ptmaup_sc_get_photo_ids($post->ID) as $attachment_id) {
            if (ptmaup_sc_attachment_issues($attachment_id)) {
                $withheld += 1;
                continue;
            }
            $url = wp_get_attachment_image_url($attachment_id, 'full');
            if (!$url) {
                $withheld += 1;
                continue;
            }
            $alt = ptmaup_sc_attachment_alt($attachment_id);
            $caption = wp_get_attachment_caption($attachment_id);
            $photos[] = [
                'id' => 'photo-' . (int) $attachment_id,
                'url' => $url,
                'alt' => $alt,
                'caption' => $caption ? trim(wp_strip_all_tags($caption)) : '',
                'consentRecorded' => true,
                'modified' => get_post_modified_time('c', true, $attachment_id),
            ];
        }

        $galleries[] = [
            'id' => ptmaup_sc_post_id($post),
            'date' => $full_date !== '' ? $full_date : $year,
            'year' => $year !== '' ? (int) $year : null,
            'title' => ptmaup_sc_plain_title($post),
            'description' => trim((string) get_post_meta($post->ID, 'ptmaup_description', true)),
            'notes' => $clean_notes,
            'withheldPhotos' => $withheld,
            'photos' => $photos,
        ];
    }

    return $galleries;
}
